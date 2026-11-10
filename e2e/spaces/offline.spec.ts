import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { API_URL, SEED_PARTICIPANT_EMAIL, SPACE_SLUG, cleanUpTestRows, inviteViaApi, signInViaApi, skipRules, spaceUrl, uniqueEmail } from "./helpers.ts";

// After a couple of online visits the app must keep working with no network at
// all: the page itself, its scripts, the real (tiled) map, the village name and
// the pins. Run against a production build - see playwright.spaces-offline.config.ts.

const PIN_LABEL = `Familie Skellington ${Date.now().toString().slice(-6)}`;
const APP_ORIGIN = "https://localhost:4174";

let session: { token: string; participantId: string; email: string; role: string };

// The API only allows the :3000 dev origin. Add CORS headers at the network layer rather than
// change the server for a test.
async function apiOnline(context: BrowserContext, online: boolean) {
  await context.unroute(`${API_URL}/**`).catch(() => undefined);
  if (!online) {
    await context.route(`${API_URL}/**`, (route) => route.abort("internetdisconnected"));
    return;
  }
  const cors = {
    "access-control-allow-origin": APP_ORIGIN,
    "access-control-allow-headers": "authorization,content-type,if-none-match",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-expose-headers": "etag",
  };
  await context.route(`${API_URL}/**`, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const response = await route.fetch();
    return route.fulfill({ response, headers: { ...response.headers(), ...cors } });
  });
}

test.beforeAll(async ({ request }) => {
  const seed = await signInViaApi(request, SEED_PARTICIPANT_EMAIL);
  const email = uniqueEmail("offline");
  const invite = await inviteViaApi(request, seed, email, "participant");
  const accepted = (await (
    await request.post(`${API_URL}/spaces/${SPACE_SLUG}/invites/${invite}/accept`, { data: { consent: true } })
  ).json()) as { token: string; participant: { id: string; email: string; role: string } };
  session = { token: accepted.token, participantId: accepted.participant.id, email, role: "participant" };
  await request.post(`${API_URL}/spaces/${SPACE_SLUG}/locations`, {
    headers: { Authorization: `Bearer ${session.token}` },
    data: { label: PIN_LABEL, note: "", lat: 49.1712, lng: 11.2915 },
  });
});

test.afterAll(async ({ request }) => {
  await request.delete(`${API_URL}/spaces/${SPACE_SLUG}/me`, { headers: { Authorization: `Bearer ${session.token}` } });
  cleanUpTestRows();
});

async function open(page: Page) {
  await page.goto(spaceUrl());
  await page.evaluate(([s, slug]) => localStorage.setItem(`space-session:${slug}`, JSON.stringify(s)), [session, SPACE_SLUG] as const);
  await page.goto(spaceUrl());
  await page.reload();
}

test("after two online visits the whole app works with no network", async ({ browser }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  await skipRules(context);
  await apiOnline(context, true);
  const page = await context.newPage();

  const tileResponses: { status: number; type: string }[] = [];
  const failedAssets: string[] = [];
  const thirdParty: string[] = [];
  // The production build is the only place some CSP violations show up
  // (e.g. Vite inlining small fonts as data: URIs, which `font-src 'self'`
  // blocks); the dev server serves every asset as a file.
  const cspViolations: string[] = [];
  page.on("console", (m) => {
    if (/content security policy|refused to/i.test(m.text())) cspViolations.push(m.text().slice(0, 200));
  });
  page.on("response", (r) => {
    if (new URL(r.url()).pathname.startsWith("/tiles/")) tileResponses.push({ status: r.status(), type: r.headers()["content-type"] ?? "" });
  });
  page.on("requestfailed", (r) => {
    // Only the app's own files; the API is aborted on purpose, and a client-side abort (ERR_ABORTED) is not a failure.
    if (r.url().startsWith(APP_ORIGIN) && r.failure()?.errorText !== "net::ERR_ABORTED") failedAssets.push(r.url());
  });
  page.on("request", (r) => {
    const origin = new URL(r.url()).origin;
    if (!r.url().startsWith("data:") && !r.url().startsWith("blob:") && ![APP_ORIGIN, new URL(API_URL).origin].includes(origin)) thirdParty.push(r.url());
  });

  // Two online visits: the first installs the worker, the second is controlled by it and fills the caches.
  await open(page);
  await expect(page.locator(".maplibregl-canvas").first()).toBeVisible();
  await page.waitForTimeout(3000);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { message: "the service worker controls the page" }).toBe(true);
  await page.waitForTimeout(3000);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Meckenhausen");

  const cached = await page.evaluate(async () => {
    const keys: string[] = [];
    for (const name of await caches.keys()) for (const r of await (await caches.open(name)).keys()) keys.push(r.url);
    return keys;
  });
  expect(cached.some((u) => new URL(u).pathname.startsWith("/assets/") && u.endsWith(".js")), "the built JS is cached").toBe(true);
  expect(cached.some((u) => new URL(u).pathname.startsWith("/tiles/")), "the tile archive is cached").toBe(true);
  expect(cached.some((u) => new URL(u).pathname === "/maplibre/maplibre-gl-worker.mjs"), "the MapLibre worker is cached").toBe(true);

  // Now: no network at all (browser offline, API unreachable).
  await apiOnline(context, false);
  await context.setOffline(true);
  const tilesBefore = tileResponses.length;
  await page.reload();

  await expect(page.getByRole("heading", { level: 1 }), "the village name comes from the local copy").toContainText("Meckenhausen");
  await expect(page.locator(".maplibregl-canvas").first()).toBeVisible();
  await expect(page.getByText("You're offline", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByText(PIN_LABEL), "pins come from the IndexedDB cache").toBeVisible();

  await expect
    .poll(() => tileResponses.slice(tilesBefore).some((r) => r.status === 206 && !r.type.includes("html")), {
      message: "real tiles were read (from the service worker's cache), not the placeholder style",
    })
    .toBe(true);
  expect(failedAssets, "no app asset failed to load offline").toEqual([]);
  expect(thirdParty, "no third-party requests").toEqual([]);
  expect(cspViolations, "no CSP violations in the production build").toEqual([]);

  await context.setOffline(false);
  await context.close();
});
