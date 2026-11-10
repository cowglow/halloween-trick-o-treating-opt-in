// Regenerates the pictures used by docs/MAPLIBRE-ONBOARDING.md from the real
// app. Needs the dev stack running (pnpm backend:up, pnpm dev on :3000) and a
// seeded space participant. Usage:
//
//   node scripts/capture-onboarding-screenshots.mjs
//
// It creates one throwaway participant (e2e-onboarding-*@example.test) through
// the API so both pin colours are visible, and removes it again at the end via
// the same self-service DELETE /me a real user has.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const APP = process.env.APP_URL ?? "https://localhost:3000/";
const API = process.env.API_URL ?? "http://localhost:4000";
const SLUG = process.env.SPACE_SLUG ?? "meckenhausen";
const SEED_EMAIL = process.env.SEED_EMAIL ?? "cowglow@gmail.com";
const OUT = new URL("../docs/images/maplibre/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const call = async (path, { method = "GET", body, token } = {}) => {
  const response = await fetch(`${API}/spaces/${SLUG}${path}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : null };
};

async function signIn(email) {
  const link = await call("/magic-link", { method: "POST", body: { email } });
  const verified = await call("/verify", { method: "POST", body: { token: link.json.devToken } });
  return { token: verified.json.token, participant: verified.json.participant };
}

const seed = await signIn(SEED_EMAIL);
const stamp = Date.now();
const invite = await call("/invites", {
  method: "POST",
  token: seed.token,
  body: { email: `e2e-onboarding-${stamp}@example.test`, role: "participant" },
});
const accepted = await call(`/invites/${invite.json.devToken}/accept`, { method: "POST", body: { consent: true } });
const me = { token: accepted.json.token, participantId: accepted.json.participant.id, email: accepted.json.participant.email, role: "participant" };
await call("/locations", {
  method: "POST",
  token: me.token,
  body: { label: "Familie Addams", note: "Trick-or-treaters welcome!", lat: 49.1712, lng: 11.2915 },
});

const browser = await chromium.launch();
const shot = (locator, name) => locator.screenshot({ path: `${OUT}${name}.png` });

async function signedInPage(context) {
  const page = await context.newPage();
  await page.goto(APP);
  await page.evaluate(([s, slug]) => localStorage.setItem(`space-session:${slug}`, JSON.stringify(s)), [me, SLUG]);
  await page.goto(`${APP}#/${SLUG}`);
  await page.reload();
  return page;
}

try {
  // --- 1. the finished map, and a popup ---------------------------------
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 760, height: 900 } });
  const page = await signedInPage(context);
  const map = page.locator(".maplibregl-map").first();
  await map.locator(".maplibregl-canvas").waitFor();
  await page.waitForTimeout(3500);
  await shot(map, "01-final-map");

  await page.getByRole("button", { name: "My house" }).click();
  await page.waitForTimeout(600);
  await shot(map, "06-popup");

  // --- 2. the same page when the tile archive is unavailable -------------
  const noTiles = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 760, height: 900 } });
  await noTiles.route("**/tiles/**", (route) => route.abort());
  const fallback = await signedInPage(noTiles);
  const fallbackMap = fallback.locator(".maplibregl-map").first();
  await fallbackMap.locator(".maplibregl-canvas").waitFor();
  await fallback.waitForTimeout(2500);
  await shot(fallbackMap, "02-placeholder-style");

  await noTiles.close();

  // --- 3. placement: fixed marker, zoom levels, inside/outside -----------
  await page.getByRole("button", { name: /Edit your pin/ }).click();
  const placement = page.locator(".maplibregl-map").first();
  await placement.locator(".maplibregl-canvas").waitFor();
  await page.waitForTimeout(3000);
  await shot(placement, "04-placement-inside");

  await placement.locator(".maplibregl-canvas").focus();
  for (const [key, times, name] of [
    ["+", 2, "03-zoom-19"],
    ["-", 4, "03-zoom-15"],
    ["-", 2, "03-zoom-13"],
  ]) {
    for (let i = 0; i < times; i++) {
      await page.keyboard.press(key === "+" ? "Equal" : "Minus");
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(2200);
    await shot(placement, name);
  }

} finally {
  await call("/me", { method: "DELETE", token: me.token });
  await browser.close();
}
console.log("screenshots written to", OUT);
