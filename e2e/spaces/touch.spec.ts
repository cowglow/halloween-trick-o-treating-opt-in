import {
  devices,
  expect,
  test,
  type CDPSession,
  type Page,
} from "@playwright/test";
import {
  API_URL,
  SEED_PARTICIPANT_EMAIL,
  cleanUpTestRows,
  inviteViaApi,
  signInViaApi,
  spaceUrl,
  uniqueEmail,
} from "./helpers.ts";

// docs/SPEC.md section 5: "Touch: pan and pinch under the marker without
// fighting page scroll (set `touch-action` correctly), test on a mobile
// viewport." Real touch input through Chromium's input pipeline (CDP
// Input.dispatchTouchEvent, not synthetic DOM events), so `touch-action` is
// honoured exactly as on a phone: if the map let the page scroll or zoom
// instead, the page would move and the map wouldn't.

test.use({ ...devices["Pixel 7"], ignoreHTTPSErrors: true });
test.describe.configure({ mode: "serial" });

type Point = { x: number; y: number };

async function touch(
  cdp: CDPSession,
  type: "touchStart" | "touchMove" | "touchEnd",
  points: Point[],
) {
  await cdp.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: points.map((point, id) => ({ ...point, id })),
  });
}

// Moves every finger from its start to its end point in small steps, like a
// real gesture, so MapLibre sees a drag rather than a jump.
async function gesture(
  page: Page,
  cdp: CDPSession,
  from: Point[],
  to: Point[],
  steps = 12,
) {
  await touch(cdp, "touchStart", from);
  for (let step = 1; step <= steps; step++) {
    const points = from.map((start, i) => ({
      x: start.x + ((to[i].x - start.x) * step) / steps,
      y: start.y + ((to[i].y - start.y) * step) / steps,
    }));
    await touch(cdp, "touchMove", points);
    await page.waitForTimeout(16);
  }
  await touch(cdp, "touchEnd", []);
}

test.afterAll(() => cleanUpTestRows());

test("on a phone, panning and pinching under the marker moves the map, not the page", async ({
  page,
  request,
}) => {
  const seedToken = await signInViaApi(request, SEED_PARTICIPANT_EMAIL).catch(
    () => {
      throw new Error(
        `API not reachable at ${API_URL} - start it with "pnpm backend:up" (see e2e/spaces/README.md)`,
      );
    },
  );
  const invite = await inviteViaApi(
    request,
    seedToken,
    uniqueEmail("touch"),
    "participant",
  );

  await page.goto(spaceUrl(`/invite?token=${invite}`));
  await page.locator('label[for="accept-consent"]').tap();
  await page.getByRole("button", { name: "Join the map" }).tap();
  // The welcome screen a new participant sees leads straight to placing the pin.
  await page.getByRole("button", { name: "Add my house" }).tap();

  const map = page.locator(".maplibregl-map").first();
  await expect(map.locator(".maplibregl-canvas")).toBeVisible();
  await map.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500); // let the tiles paint before taking reference pictures

  const status = page.getByRole("status");
  const box = (await map.boundingBox())!;
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const pageState = () =>
    page.evaluate(() => ({
      scrollY: window.scrollY,
      scale: window.visualViewport?.scale ?? 1,
    }));
  const before = await pageState();
  const cdp = await page.context().newCDPSession(page);

  // One finger: pans the map, and the announced position under the marker follows.
  const announcedBefore = await status.textContent();
  await gesture(page, cdp, [centre], [{ x: centre.x - 80, y: centre.y - 60 }]);
  await expect(
    status,
    "a one-finger drag pans the map under the marker",
  ).not.toHaveText(announcedBefore ?? "");
  expect(await pageState(), "the page itself did not scroll or zoom").toEqual(
    before,
  );

  // Two fingers spreading apart around the marker: zooms the map in.
  const mapBefore = await map.screenshot();
  await gesture(
    page,
    cdp,
    [
      { x: centre.x - 30, y: centre.y },
      { x: centre.x + 30, y: centre.y },
    ],
    [
      { x: centre.x - 120, y: centre.y },
      { x: centre.x + 120, y: centre.y },
    ],
  );
  await page.waitForTimeout(1500);
  expect(
    (await map.screenshot()).equals(mapBefore),
    "a pinch zooms the map",
  ).toBe(false);
  expect(await pageState(), "the page itself did not scroll or zoom").toEqual(
    before,
  );

  await expect(
    page.getByRole("button", { name: "This is my front door" }),
  ).toBeEnabled();
});
