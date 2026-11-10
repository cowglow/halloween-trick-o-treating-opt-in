import { readFileSync } from "node:fs";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  API_URL,
  SEED_PARTICIPANT_EMAIL,
  E2E_EVENT_END_AT,
  SPACE_SLUG,
  cleanUpTestRows,
  inviteViaApi,
  signInViaApi,
  skipRules,
  spaceUrl,
  uniqueEmail,
} from "./helpers.ts";

// Every action in the Halloween map, driven through a real browser against the
// real API and Postgres (see e2e/spaces/README.md). Also fails on any CSP
// violation (only enforced by a real browser) and on any request to an origin
// other than the app itself and the API - the "no third-party requests"
// privacy requirement.

const PARTICIPANT_EMAIL = uniqueEmail("participant");
const VISITOR_EMAIL = uniqueEmail("visitor");
const REVOKE_EMAIL = uniqueEmail("revoke");
const ASKER_EMAIL = uniqueEmail("asker");
const DENIED_EMAIL = uniqueEmail("denied");

// A pin name from docs/FamilySurnames.md, made unique per run so the assertions
// can't be satisfied by another neighbour's pin already in the database.
const surnames = readFileSync(new URL("../../docs/FamilySurnames.md", import.meta.url), "utf-8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);
const SURNAME = surnames[Math.floor(Math.random() * surnames.length)];
const RUN = Date.now().toString().slice(-6);
const PIN_LABEL = `${SURNAME} ${RUN}`;
const EDITED_LABEL = `${SURNAME} ${RUN} (edited)`;
const SECOND_LABEL = `${SURNAME} ${RUN} (second house)`;

// Overridable to run the suite beside a dev server already on :3000.
const APP_ORIGIN = process.env.E2E_APP_ORIGIN ?? "https://localhost:3000";
const allowedOrigins = new Set([APP_ORIGIN, new URL(API_URL).origin]);

let seedToken = "";
let participantInvite = "";
let participantToken = "";
let visitorInviteToken = "";
let visitorToken = "";
let participantContext: BrowserContext;
let participantPage: Page;
let visitorContext: BrowserContext;
let visitorPage: Page;

const consoleProblems: string[] = [];
const externalRequests: string[] = [];
const spaceAssetResponses: { url: string; status: number; type: string }[] = [];

test.describe.configure({ mode: "serial" });

function watch(page: Page) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleProblems.push(message.text());
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));
  page.on("request", (request) => {
    const url = request.url();
    if (url.startsWith("data:") || url.startsWith("blob:")) return;
    if (!allowedOrigins.has(new URL(url).origin)) externalRequests.push(url);
  });
  page.on("response", (response) => {
    if (/^\/(tiles|fonts|sprite|maplibre)\//.test(new URL(response.url()).pathname)) {
      spaceAssetResponses.push({
        url: response.url(),
        status: response.status(),
        type: response.headers()["content-type"] ?? "",
      });
    }
  });
}

async function newWatchedPage(browser: import("@playwright/test").Browser) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  await skipRules(context);
  const page = await context.newPage();
  watch(page);
  return { context, page };
}

async function storedSession(page: Page): Promise<{ token: string; role: string }> {
  const raw = await page.evaluate((slug) => localStorage.getItem(`space-session:${slug}`), SPACE_SLUG);
  expect(raw, "expected a stored space session").not.toBeNull();
  return JSON.parse(raw!) as { token: string; role: string };
}

// Like a real user, click the checkbox's label, then assert the input's state.
async function tick(page: Page, inputId: string) {
  await page.locator(`label[for="${inputId}"]`).click();
  await expect(page.locator(`#${inputId}`)).toBeChecked();
}

async function showList(page: Page) {
  await page.getByRole("button", { name: "List", exact: true }).click();
}

async function showMap(page: Page) {
  await page.getByRole("button", { name: "Map", exact: true }).click();
}

async function fromMenu(page: Page, item: string) {
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: item }).click();
}

async function acceptInvite(page: Page, inviteToken: string) {
  await page.goto(spaceUrl(`/invite?token=${inviteToken}`));
  await expect(page.getByRole("heading", { name: "You're invited to the Meckenhausen Halloween map" })).toBeVisible();
  await tick(page, "accept-consent");
  await page.getByRole("button", { name: "Join the map" }).click();
}

const NAME_FIELD = "Name on the map";
const NOTE_FIELD = "Note for trick-or-treaters";

async function placeAndSavePin(page: Page, label: string, note = "") {
  await page.getByRole("button", { name: "This is my front door" }).click();
  await page.getByLabel(NAME_FIELD).fill(label);
  if (note) await page.getByLabel(NOTE_FIELD).fill(note);
  await page.getByRole("button", { name: "Save my house" }).click();
}

test.beforeAll(async ({ request }) => {
  const health = await request.get(`${API_URL}/health`).catch(() => null);
  if (!health?.ok()) {
    throw new Error(`API not reachable at ${API_URL} - start it with "pnpm backend:up" (see e2e/spaces/README.md)`);
  }
  seedToken = await signInViaApi(request, SEED_PARTICIPANT_EMAIL);
  participantInvite = await inviteViaApi(request, seedToken, PARTICIPANT_EMAIL, "participant");
});

test.afterAll(async () => {
  await participantContext?.close();
  await visitorContext?.close();
  cleanUpTestRows();
  expect(
    consoleProblems.filter((problem) => /content security policy|refused to/i.test(problem)),
    "no CSP violations",
  ).toEqual([]);
  expect(externalRequests, "no requests to third-party origins").toEqual([]);
});

test("unauthenticated API access is rejected", async ({ request }) => {
  for (const path of ["/me", "/locations", "/invites"]) {
    const response = await request.get(`${API_URL}/spaces/${SPACE_SLUG}${path}`);
    expect(response.status(), path).toBe(401);
  }
});

test("the seeded participant signs in with the email form and signs out again", async ({ browser }) => {
  const { context, page } = await newWatchedPage(browser);
  await page.goto(spaceUrl());
  await page.getByLabel("Your email").fill(SEED_PARTICIPANT_EMAIL);
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(page.getByRole("button", { name: "Invite neighbors" })).toBeVisible();

  await fromMenu(page, "Sign out");
  await expect(page.getByLabel("Your email")).toBeVisible();
  await context.close();
});

test("the trick-or-treat rules pop up on the first visit to the map, and stay in the menu", async ({ browser }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  watch(page);
  await page.goto(spaceUrl());
  await page.getByLabel("Your email").fill(SEED_PARTICIPANT_EMAIL);
  await page.getByRole("button", { name: "Send sign-in link" }).click();

  const rules = page.getByRole("dialog", { name: "Before you head out" });
  await expect(rules).toBeVisible();
  await expect(rules.getByRole("listitem")).toHaveCount(5);
  await expect(rules.getByText("A pin or a pumpkin: ring")).toBeVisible();
  await expect(rules.getByText("No pin, no pumpkin: walk on")).toBeVisible();
  await rules.getByRole("button", { name: "Got it, let's go!" }).click();
  await expect(rules).toBeHidden();

  await page.reload();
  await expect(page.getByRole("button", { name: "Invite neighbors" })).toBeVisible();
  await expect(rules, "only the first time").toBeHidden();

  await fromMenu(page, "Trick-or-treat rules");
  await expect(rules).toBeVisible();
  await rules.getByRole("button", { name: "Got it, let's go!" }).click();
  await fromMenu(page, "Sign out");
  await context.close();
});

test("after the event every address shows that the map has closed, except the privacy notice", async ({ browser }) => {
  const { context, page } = await newWatchedPage(browser);
  await page.clock.setFixedTime(new Date(new Date(E2E_EVENT_END_AT).getTime() + 30_000));
  await page.goto(spaceUrl());
  await expect(page.getByRole("heading", { level: 1, name: "Thank you, Meckenhausen!" })).toBeVisible();
  await expect(page.getByText("This map has ended and its data has been removed.")).toBeVisible();
  await expect(page.getByLabel("Your email"), "no sign-in form any more").toHaveCount(0);

  await page.goto(spaceUrl("/invite?token=whatever"));
  await expect(page.getByRole("heading", { level: 1, name: "Thank you, Meckenhausen!" })).toBeVisible();

  await page.goto(spaceUrl("/privacy"));
  await expect(page.getByRole("heading", { level: 1, name: "Privacy notice" })).toBeVisible();
  await context.close();
});

test("an uninvited email cannot sign in (no token is handed out)", async ({ request }) => {
  const response = await request.post(`${API_URL}/spaces/${SPACE_SLUG}/magic-link`, {
    data: { email: uniqueEmail("stranger") },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).not.toHaveProperty("devToken");
});

test("the privacy notice opens from its link, shows the notice version, and leads back", async ({ browser }) => {
  const { context, page } = await newWatchedPage(browser);
  await page.goto(spaceUrl());
  // A plain href here once pointed outside the hash router (/meckenhausen/privacy),
  // which GitHub Pages answers with its 404 page.
  await page.getByRole("link", { name: "Privacy notice" }).click();
  await expect(page).toHaveURL(/#\/meckenhausen\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy notice" })).toBeVisible();
  await expect(page.getByText("Notice version: 2026-10-30")).toBeVisible();
  // The e2e stack's event end (E2E_EVENT_END_AT).
  await expect(page.getByText("November 1, 2099 at 12:00", { exact: false }), "date in English, Bavarian time").toBeVisible();
  await page.getByRole("link", { name: "Back to the map" }).click();
  await expect(page.getByLabel("Your email")).toBeVisible();
  await context.close();
});

test("a German browser gets German, and a language picked by hand is remembered", async ({ browser }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: "de-DE" });
  await skipRules(context);
  const page = await context.newPage();
  watch(page);
  await page.goto(spaceUrl());
  await expect(page.getByLabel("Deine E-Mail-Adresse")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");

  await page.getByRole("link", { name: "Datenschutzhinweis" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Datenschutzhinweis" })).toBeVisible();
  await expect(page.getByText("1. November 2099 um 00:00", { exact: false })).toBeVisible();

  await page.getByLabel("Sprache").selectOption("en");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy notice" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Privacy notice" }), "the choice survives a reload").toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await context.close();
});

test("the map tells the server the language it's shown in, so the emails use it", async ({ browser }) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: "de-DE" });
  await skipRules(context);
  const page = await context.newPage();
  watch(page);
  const languageSent = (language: string) =>
    page.waitForRequest(
      (request) =>
        request.method() === "PUT" &&
        request.url().endsWith(`/spaces/${SPACE_SLUG}/me/language`) &&
        request.postDataJSON()?.language === language,
    );

  await page.goto(spaceUrl());
  const opened = languageSent("de");
  await page.getByLabel("Deine E-Mail-Adresse").fill(SEED_PARTICIPANT_EMAIL);
  await page.getByRole("button", { name: "Anmeldelink senden" }).click();
  expect((await (await opened).response())?.status(), "on opening the map").toBe(204);

  const changed = languageSent("es");
  await page.getByRole("button", { name: "Menü" }).click();
  await page.getByRole("dialog", { name: "Menü" }).getByLabel("Sprache").selectOption("es");
  expect((await (await changed).response())?.status(), "on changing the language").toBe(204);

  // Back to German, the seeded participant's language.
  const back = languageSent("de");
  await page.getByRole("dialog", { name: "Menú" }).getByLabel("Idioma").selectOption("de");
  await back;
  await context.close();
});

test("an invited participant accepts with consent and lands signed in", async ({ browser }) => {
  ({ context: participantContext, page: participantPage } = await newWatchedPage(browser));
  await acceptInvite(participantPage, participantInvite);
  // A new participant gets the three-step welcome once.
  await expect(participantPage.getByRole("heading", { name: "Put your house on the map in three steps" })).toBeVisible();
  await participantPage.getByRole("button", { name: "Just look at the map" }).click();
  await expect(participantPage.getByRole("button", { name: "Add my house" })).toBeVisible();
  const session = await storedSession(participantPage);
  expect(session.role).toBe("participant");
  participantToken = session.token;

  const reuse = await participantPage.request.post(
    `${API_URL}/spaces/${SPACE_SLUG}/invites/${participantInvite}/accept`,
    { data: { consent: true } },
  );
  expect(reuse.status(), "an invite is single-use").toBe(400);
});

test("accepting an invite without consent is refused by the API", async ({ request }) => {
  const throwaway = await inviteViaApi(request, seedToken, uniqueEmail("noconsent"), "visitor");
  const response = await request.post(`${API_URL}/spaces/${SPACE_SLUG}/invites/${throwaway}/accept`, {
    data: { consent: false },
  });
  expect(response.status()).toBe(400);
});

test("the map renders from self-hosted tiles, worker, fonts and sprite", async () => {
  const page = participantPage;
  await page.reload();
  await expect(page.locator(".maplibregl-canvas").first()).toBeVisible();
  await expect
    .poll(() => spaceAssetResponses.some((r) => r.url.includes("/tiles/") && [200, 206].includes(r.status)), {
      message: "the .pmtiles archive should be fetched (range requests)",
    })
    .toBe(true);
  await expect
    .poll(() => spaceAssetResponses.some((r) => r.url.includes("maplibre-gl-worker.mjs") && r.status === 200), {
      message: "the MapLibre worker module should load",
    })
    .toBe(true);
  await expect
    .poll(() => spaceAssetResponses.some((r) => r.url.includes("/sprite/") && r.status === 200))
    .toBe(true);

  const broken = spaceAssetResponses.filter((r) => r.status >= 400 || r.type.includes("text/html"));
  expect(broken, "no asset may 404 or be answered with the SPA's HTML fallback").toEqual([]);

  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { message: "service worker controls the page" })
    .toBe(true);
});

test("the participant places a pin with the nudge buttons", async () => {
  const page = participantPage;
  await page.getByRole("button", { name: "Add my house" }).click();
  await expect(page.getByText("Inside Meckenhausen", { exact: true })).toBeVisible();

  const status = page.getByRole("status");
  const before = await status.textContent();
  await page.getByRole("button", { name: "Move north" }).click();
  await expect(status).not.toHaveText(before ?? "");

  await placeAndSavePin(page, PIN_LABEL, "Bring a bag please\nsecond line");
  await expect(page.getByRole("button", { name: "Edit my house" })).toBeVisible();
});

test("panning the map with the keyboard updates the announced position (it only followed the nudge buttons before)", async () => {
  const page = participantPage;
  await page.getByRole("button", { name: "Edit my house" }).click();
  const status = page.getByRole("status");
  const before = await status.textContent();

  await page.locator(".maplibregl-canvas").focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
  await expect(status).not.toHaveText(before ?? "");
  await expect(status).toContainText("inside the map area");
  await expect(page.getByRole("button", { name: "This is my front door" })).toBeEnabled();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Edit my house" })).toBeVisible();
});

test("\"Use my location\" from outside the village recentres on it and says why", async () => {
  const page = participantPage;
  await participantContext.grantPermissions(["geolocation"]);
  await participantContext.setGeolocation({ latitude: 52.52, longitude: 13.405 }); // Berlin

  await page.getByRole("button", { name: "Edit my house" }).click();
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByRole("alert")).toContainText("outside Meckenhausen");
  await expect(page.getByRole("status")).toContainText("inside the map area");
  await expect(page.getByRole("button", { name: "This is my front door" })).toBeEnabled();

  await page.keyboard.press("Escape");
  await participantContext.clearPermissions();
  await expect(page.getByRole("button", { name: "Edit my house" })).toBeVisible();
});

test("the map/list toggle shows the pin as text with its note", async () => {
  const page = participantPage;
  await showList(page);
  await expect(page.getByText(PIN_LABEL)).toBeVisible();
  await expect(page.getByText("Bring a bag please")).toBeVisible();
  await showMap(page);
  await expect(page.locator(".maplibregl-canvas").first()).toBeVisible();
  await showList(page);
});

test("the map view can be panned and zoomed (it was frozen before)", async () => {
  const page = participantPage;
  await showMap(page);
  const map = page.locator(".maplibregl-map").first();
  await expect(map.locator(".maplibregl-canvas")).toBeVisible();
  await page.waitForTimeout(2500); // let the tiles paint before taking reference pictures

  const changed = async (action: () => Promise<void>) => {
    const before = await map.screenshot();
    await action();
    await page.waitForTimeout(1500);
    return !(await map.screenshot()).equals(before);
  };
  const box = (await map.boundingBox())!;
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  expect(
    await changed(async () => {
      await page.mouse.move(centre.x, centre.y);
      await page.mouse.down();
      await page.mouse.move(centre.x - 150, centre.y - 80, { steps: 10 });
      await page.mouse.up();
    }),
    "dragging pans the map",
  ).toBe(true);
  expect(
    await changed(async () => {
      await page.mouse.move(centre.x, centre.y);
      await page.mouse.wheel(0, -500);
    }),
    "the mouse wheel zooms the map",
  ).toBe(true);
  await showList(page);
});

test("tapping the map puts the spot under the pumpkin", async () => {
  const page = participantPage;
  await page.getByRole("button", { name: "Edit my house" }).click();
  const status = page.getByRole("status");
  const before = await status.textContent();
  const box = (await page.locator(".maplibregl-canvas").boundingBox())!;
  // East of the pumpkin: the announced longitude grows, the latitude stays.
  await page.mouse.click(box.x + box.width / 2 + 80, box.y + box.height / 2);
  await expect(status).not.toHaveText(before ?? "");
  const coords = (text: string | null) => (text?.match(/\d+\.\d{5}/g) ?? []).map(Number);
  const [latBefore, lngBefore] = coords(before);
  const [latAfter, lngAfter] = coords(await status.textContent());
  expect(lngAfter).toBeGreaterThan(lngBefore);
  expect(Math.abs(latAfter - latBefore)).toBeLessThan(0.0002);
  await page.keyboard.press("Escape");
});

test("Escape cancels pin placement without changing the pin", async () => {
  const page = participantPage;
  await page.getByRole("button", { name: "Edit my house" }).click();
  await expect(page.getByRole("heading", { name: "Tap your front door, or move the map until the pumpkin is on it" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Edit my house" })).toBeVisible();
  await expect(page.getByText(PIN_LABEL)).toBeVisible();
});

test("the participant edits their pin", async () => {
  const page = participantPage;
  await page.getByRole("button", { name: "Edit my house" }).click();
  await page.getByRole("button", { name: "Move east" }).click();
  await placeAndSavePin(page, EDITED_LABEL);
  await expect(page.getByText(EDITED_LABEL)).toBeVisible();
  await expect(page.getByText(PIN_LABEL, { exact: true })).toHaveCount(0);
});

test("the participant deletes their pin through an accessible confirm dialog", async () => {
  const page = participantPage;
  await page.getByRole("button", { name: "Edit my house" }).click();
  await page.getByRole("button", { name: "This is my front door" }).click();
  await page.getByRole("button", { name: "Remove my house" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Remove your house from the map?" });
  await expect(dialog).toBeVisible();

  // Cancel first: nothing is deleted.
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel(NAME_FIELD)).toHaveValue(EDITED_LABEL);

  await page.getByRole("button", { name: "Remove my house" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove my house" }).click();
  await expect(page.getByRole("button", { name: "Add my house" })).toBeVisible();
  await expect(page.getByText(EDITED_LABEL)).toHaveCount(0);

  // ...and they can add one again.
  await page.getByRole("button", { name: "Add my house" }).click();
  await placeAndSavePin(page, PIN_LABEL);
  await expect(page.getByText(PIN_LABEL)).toBeVisible();
});

test("clicking a pin opens its popup; hostile text is shown as text, never as markup", async () => {
  const page = participantPage;
  const hostileLabel = `<img src=x onerror="window.__xss=1"> ${RUN}`;
  const hostileNote = "<script>window.__xss=2</script>\n<b>not bold</b>";

  await page.getByRole("button", { name: "Edit my house" }).click();
  await page.getByRole("button", { name: "This is my front door" }).click();
  await page.getByLabel(NAME_FIELD).fill(hostileLabel);
  await page.getByLabel(NOTE_FIELD).fill(hostileNote);
  await page.getByRole("button", { name: "Save my house" }).click();
  await expect(page.getByRole("button", { name: "Edit my house" })).toBeVisible();

  // Map view: the pin's button opens a popup (mouse, then keyboard), showing the text literally.
  await showMap(page);
  const pin = page.getByRole("button", { name: hostileLabel, exact: true });
  await pin.click();
  const popup = page.locator(".maplibregl-popup");
  await expect(popup).toContainText(hostileLabel);
  await expect(popup).toContainText("<script>window.__xss=2</script>");
  await expect(pin).toHaveAttribute("aria-expanded", "true");
  await pin.press("Enter");
  await expect(popup).toHaveCount(0);
  await pin.press("Enter");
  await expect(popup).toHaveCount(1);

  // List view shows it as text too.
  await showList(page);
  await expect(page.getByText(hostileLabel, { exact: false })).toBeVisible();

  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss), "no injected script ran").toBeUndefined();
  expect(await page.locator("img[src='x'], b:has-text('not bold')").count(), "no injected element exists").toBe(0);

  // Put the ordinary label back for the tests that follow.
  await page.getByRole("button", { name: "Edit my house" }).click();
  await page.getByRole("button", { name: "This is my front door" }).click();
  await page.getByLabel(NAME_FIELD).fill(PIN_LABEL);
  await page.getByLabel(NOTE_FIELD).fill("");
  await page.getByRole("button", { name: "Save my house" }).click();
  await expect(page.getByText(PIN_LABEL)).toBeVisible();
});

test("a second participant adds a house, and both houses show for everyone", async ({ browser, request }) => {
  const invite = await inviteViaApi(request, seedToken, uniqueEmail("second"), "participant");
  const { context, page } = await newWatchedPage(browser);
  await acceptInvite(page, invite);

  // The welcome screen leads straight into adding the house.
  await page.getByRole("button", { name: "Add my house" }).click();
  await page.getByRole("button", { name: "Move west" }).click();
  await placeAndSavePin(page, SECOND_LABEL, "Ring twice");
  await expect(page.getByRole("button", { name: "Edit my house" })).toBeVisible();

  // On the map: both pins are there, and the new house is on screen right away.
  await expect(page.getByRole("button", { name: SECOND_LABEL, exact: true })).toBeInViewport();
  await expect(page.getByRole("button", { name: PIN_LABEL, exact: true })).toHaveCount(1);
  await showList(page);
  await expect(page.getByText(SECOND_LABEL)).toBeVisible();
  await expect(page.getByText(PIN_LABEL, { exact: true })).toBeVisible();

  // Moving it shows the new spot without switching views (the map used to keep the
  // view it had opened with before the save, leaving the moved house out of sight).
  await showMap(page);
  await page.getByRole("button", { name: "Edit my house" }).click();
  for (let i = 0; i < 10; i++) await page.getByRole("button", { name: "Move east" }).click();
  await placeAndSavePin(page, SECOND_LABEL);
  await expect(page.getByRole("button", { name: "Edit my house" })).toBeVisible();
  await expect(page.getByRole("button", { name: SECOND_LABEL, exact: true })).toBeInViewport();

  // The first participant sees it after a refresh.
  await participantPage.getByRole("button", { name: "Refresh the map" }).click();
  await showList(participantPage);
  await expect(participantPage.getByText(SECOND_LABEL)).toBeVisible();

  await page.request.delete(`${API_URL}/spaces/${SPACE_SLUG}/me`, {
    headers: { Authorization: `Bearer ${(await storedSession(page)).token}` },
  });
  await context.close();
});

test("the invite dialog is an accessible modal", async () => {
  const page = participantPage;
  const opener = page.getByRole("button", { name: "Invite neighbors" });
  await opener.click();

  const dialog = page.getByRole("dialog", { name: "Invite neighbors" });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel("Their email")).toBeFocused();

  // Focus never reaches the page behind the dialog: tabbing many times either
  // stays inside it or briefly leaves to the browser's own UI (activeElement
  // becomes <body>), but never lands on a background control.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const where = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body) return "browser-ui";
      return active.closest("dialog") ? "dialog" : `background:${active.tagName}:${active.textContent?.slice(0, 20)}`;
    });
    expect(["dialog", "browser-ui"], `tab #${i + 1} landed on ${where}`).toContain(where);
  }

  // The page behind it is inert: the dialog is modal, and a click aimed at a
  // background button no longer reaches that button.
  expect(await page.evaluate(() => document.querySelector("dialog")!.matches(":modal"))).toBe(true);
  // A CSS locator, not getByRole: the modal takes the page behind it out of the accessibility tree.
  const box = await page.locator(".bottom-bar button").first().boundingBox();
  const reachable = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest(".bottom-bar") != null,
    { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
  );
  expect(reachable, "background button is unreachable while the modal is open").toBe(false);

  // Escape closes it and returns focus to the button that opened it.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("the participant invites a visitor, and can revoke and then delete another invite", async () => {
  const page = participantPage;
  await page.getByRole("button", { name: "Invite neighbors" }).click();
  const dialog = page.getByRole("dialog", { name: "Invite neighbors" });

  await dialog.getByLabel("Their email").fill(VISITOR_EMAIL);
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith(`/spaces/${SPACE_SLUG}/invites`) && r.request().method() === "POST"),
    dialog.getByRole("button", { name: "Send invite" }).click(),
  ]);
  expect(response.status()).toBe(201);
  visitorInviteToken = ((await response.json()) as { devToken: string }).devToken;
  await expect(dialog.getByRole("listitem").filter({ hasText: VISITOR_EMAIL })).toContainText("Pending");

  await dialog.getByLabel("Their email").fill(REVOKE_EMAIL);
  await dialog.getByRole("button", { name: "Send invite" }).click();
  const revokeRow = dialog.getByRole("listitem").filter({ hasText: REVOKE_EMAIL });
  await expect(revokeRow).toContainText("Pending");
  await revokeRow.getByRole("button", { name: "Revoke" }).click();
  await expect(revokeRow).toContainText("Revoked");
  await revokeRow.getByRole("button", { name: "Delete" }).click();
  await expect(revokeRow).toHaveCount(0);

  const list = await page.request.get(`${API_URL}/spaces/${SPACE_SLUG}/invites`, {
    headers: { Authorization: `Bearer ${participantToken}` },
  });
  expect(JSON.stringify(await list.json()), "the token hash is never exposed").not.toContain("tokenHash");

  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});

test("a revoked invite can no longer be accepted", async ({ request }) => {
  const token = await inviteViaApi(request, seedToken, uniqueEmail("revoked-api"), "visitor");
  const list = (await (
    await request.get(`${API_URL}/spaces/${SPACE_SLUG}/invites`, { headers: { Authorization: `Bearer ${seedToken}` } })
  ).json()) as { invites: { id: string; email: string }[] };
  const mine = list.invites.find((invite) => invite.email.startsWith("e2e-revoked-api"));
  expect(mine).toBeTruthy();
  await request.delete(`${API_URL}/spaces/${SPACE_SLUG}/invites/${mine!.id}`, {
    headers: { Authorization: `Bearer ${seedToken}` },
  });
  const accept = await request.post(`${API_URL}/spaces/${SPACE_SLUG}/invites/${token}/accept`, {
    data: { consent: true },
  });
  expect(accept.status()).toBe(400);
});

async function askToJoin(page: Page, email: string, note: string) {
  await page.goto(spaceUrl());
  await page.getByRole("link", { name: "No invite yet? Ask to join" }).click();
  await expect(page.getByRole("heading", { name: "Ask to join the map" })).toBeVisible();
  await page.getByLabel("Your email").fill(email);
  await page.getByLabel("Who are you? (optional)").fill(note);
  await tick(page, "request-consent");
  await page.getByRole("button", { name: "Ask to join" }).click();
  await expect(page.getByRole("status")).toContainText("Watch your inbox for an invite");
}

test("someone without an invite asks to join; a participant allows one request and denies another", async ({
  browser,
}) => {
  const { context, page } = await newWatchedPage(browser);
  await askToJoin(page, ASKER_EMAIL, "Anna, new on <b>Kirchweg</b>");
  await askToJoin(page, DENIED_EMAIL, "");

  await participantPage.getByRole("button", { name: "Refresh the map" }).click();
  await participantPage.getByRole("button", { name: /asked to join/ }).click();
  const dialog = participantPage.getByRole("dialog", { name: "Requests to join" });
  const asked = dialog.getByRole("article", { name: ASKER_EMAIL });
  // The note is shown as text, never as markup.
  await expect(asked).toContainText("Anna, new on <b>Kirchweg</b>");

  const [allowed] = await Promise.all([
    participantPage.waitForResponse((r) => r.url().endsWith("/allow") && r.request().method() === "POST"),
    asked.getByRole("button", { name: "Allow" }).click(),
  ]);
  expect(allowed.status()).toBe(200);
  const inviteToken = ((await allowed.json()) as { devToken: string }).devToken;
  await expect(dialog.getByRole("status")).toHaveText(`Invite sent to ${ASKER_EMAIL}.`);
  await expect(asked).toHaveCount(0);

  const denied = dialog.getByRole("article", { name: DENIED_EMAIL });
  await denied.getByRole("button", { name: "Deny" }).click();
  await expect(denied).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close" }).click();

  // With nobody waiting, the map still shows that requests were answered,
  // for whoever opens it from the notice email - without who asked.
  await participantPage.getByRole("button", { name: "2 requests answered" }).click();
  const answered = dialog.getByRole("region", { name: "Answered in the last 24 hours" });
  await expect(answered.getByRole("listitem")).toHaveText([/Turned down by you$/, /Let in by you, invite sent, not joined yet$/]);
  await expect(answered).not.toContainText("@");
  await dialog.getByRole("button", { name: "Close" }).click();

  // The allowed person joins through the normal invite, as a visitor.
  await acceptInvite(page, inviteToken);
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  expect((await storedSession(page)).role).toBe("visitor");

  // ...and the answer now says so.
  await participantPage.getByRole("button", { name: "Refresh the map" }).click();
  await participantPage.getByRole("button", { name: "2 requests answered" }).click();
  await expect(answered.getByRole("listitem").last()).toHaveText(/Let in by you, joined the map$/);
  await dialog.getByRole("button", { name: "Close" }).click();
  await context.close();
});

test("the menu leads to the WhatsApp images, only in the reader's language", async () => {
  await participantPage.getByRole("button", { name: "Menu" }).click();
  await participantPage.getByRole("button", { name: "Let your neighbors know" }).click();
  await expect(participantPage.getByRole("heading", { level: 1, name: "Let your neighbors know" })).toBeVisible();
  await expect(participantPage.getByRole("heading", { level: 2 })).toHaveText([
    "Where's the candy?",
    "Handing out sweets?",
    "Not into Halloween?",
    "How to get on the map",
    "Who are you inviting?",
  ]);
  const downloads = participantPage.getByRole("button", { name: "Download" });
  await expect(downloads).toHaveCount(5);
  for (const href of await downloads.evaluateAll((links) => links.map((a) => a.getAttribute("href")))) {
    expect(href).toMatch(/whatsapp\/[a-z-]+-en\.png$/);
  }
  // The images are really there (not the SPA's HTML answering a 404).
  const image = participantPage.getByRole("img", { name: /how to get on the map/i });
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1080);
  await expect(participantPage.getByText(/#\/meckenhausen\/request-access/).first()).toBeVisible();

  await participantPage.getByLabel("Language").selectOption("de");
  await expect(participantPage.getByRole("heading", { level: 1, name: "Sag es den Nachbar:innen" })).toBeVisible();
  for (const href of await participantPage
    .getByRole("button", { name: "Herunterladen" })
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")))) {
    expect(href).toMatch(/-de\.png$/);
  }
  await participantPage.getByLabel("Sprache").selectOption("en");
  await participantPage.getByRole("link", { name: "Back to the map" }).click();
  await expect(participantPage.getByRole("button", { name: "Menu" })).toBeVisible();
});

test("a visitor sees the pin but cannot add, invite or write", async ({ browser }) => {
  ({ context: visitorContext, page: visitorPage } = await newWatchedPage(browser));
  await acceptInvite(visitorPage, visitorInviteToken);
  await visitorPage.getByRole("button", { name: "Menu" }).click();
  await expect(visitorPage.getByText("Signed in as a visitor (view only)")).toBeVisible();
  await visitorPage.keyboard.press("Escape");
  await expect(visitorPage.getByRole("button", { name: "Add my house" })).toHaveCount(0);
  await expect(visitorPage.getByRole("button", { name: "Invite neighbors" })).toHaveCount(0);

  await showList(visitorPage);
  await expect(visitorPage.getByText(PIN_LABEL)).toBeVisible();

  visitorToken = (await storedSession(visitorPage)).token;
  const write = await visitorPage.request.post(`${API_URL}/spaces/${SPACE_SLUG}/locations`, {
    headers: { Authorization: `Bearer ${visitorToken}` },
    data: { label: "nope", note: "", lat: 49.17, lng: 11.29 },
  });
  expect(write.status()).toBe(403);
  const invite = await visitorPage.request.post(`${API_URL}/spaces/${SPACE_SLUG}/invites`, {
    headers: { Authorization: `Bearer ${visitorToken}` },
    data: { email: uniqueEmail("escalate"), role: "participant" },
  });
  expect(invite.status()).toBe(403);
});

test("the API rejects a pin outside the Meckenhausen boundary", async ({ request }) => {
  const response = await request.post(`${API_URL}/spaces/${SPACE_SLUG}/locations`, {
    headers: { Authorization: `Bearer ${participantToken}` },
    data: { label: "Berlin", note: "", lat: 52.52, lng: 13.405 },
  });
  expect(response.status()).toBe(400);
});

// Whether any Cache Storage cache on this origin holds the .pmtiles archive.
function tilesAreCached(page: Page) {
  return page.evaluate(async () => {
    for (const name of await caches.keys()) {
      const requests = await (await caches.open(name)).keys();
      if (requests.some((request) => request.url.includes("/tiles/"))) return true;
    }
    return false;
  });
}

test("a participant who has an accepted invitee can remove themselves (regression)", async ({ request }) => {
  const page = participantPage;
  // docs/SPEC.md section 6: "Remove me" clears the caches too, but only this
  // app's: an origin can be shared with other sites (this one was, on cowglow.github.io).
  await expect.poll(() => tilesAreCached(page), { message: "the tiles were cached while using the map" }).toBe(true);
  await page.evaluate(() => caches.open("another-site").then((cache) => cache.put("/another-site", new Response("x"))));

  await fromMenu(page, "Remove me from the map");
  const dialog = page.getByRole("alertdialog", { name: "Remove yourself from this map?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog.getByRole("button", { name: "Yes, remove me" }).click();
  await expect(page.getByLabel("Your email")).toBeVisible();
  await expect.poll(() => tilesAreCached(page), { message: "Remove me clears the app's caches" }).toBe(false);
  expect(await page.evaluate(() => caches.has("another-site")), "another site's cache is left alone").toBe(true);
  expect(
    await page.evaluate((slug) => localStorage.getItem(`space-session:${slug}`), SPACE_SLUG),
    "the session is gone",
  ).toBeNull();

  const stale = await request.get(`${API_URL}/spaces/${SPACE_SLUG}/me`, {
    headers: { Authorization: `Bearer ${participantToken}` },
  });
  expect(stale.status(), "the removed participant's session dies immediately").toBe(401);

  const relink = await request.post(`${API_URL}/spaces/${SPACE_SLUG}/magic-link`, { data: { email: PARTICIPANT_EMAIL } });
  expect(await relink.json(), "the erased email can't sign in again").not.toHaveProperty("devToken");
});

test("the visitor's map no longer shows the removed participant's pin, and the visitor can remove themselves", async ({
  request,
}) => {
  const page = visitorPage;
  await page.getByRole("button", { name: "Refresh the map" }).click();
  await showList(page);
  await expect(page.getByText(PIN_LABEL)).toHaveCount(0);

  await fromMenu(page, "Remove me from the map");
  await page.getByRole("alertdialog").getByRole("button", { name: "Yes, remove me" }).click();
  await expect(page.getByLabel("Your email")).toBeVisible();

  const after = await request.get(`${API_URL}/spaces/${SPACE_SLUG}/me`, {
    headers: { Authorization: `Bearer ${visitorToken}` },
  });
  expect(after.status()).toBe(401);
});
