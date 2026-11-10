import { expect, test, type Page } from "@playwright/test";

// The project site: its pages render, the demo adds a house without any
// server, and nothing is requested from anyone but the site itself.
const SITE_ORIGIN = "https://localhost:3002";

function watchRequests(page: Page): string[] {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(SITE_ORIGIN) && !url.startsWith("data:") && !url.startsWith("blob:")) external.push(url);
  });
  return external;
}

test("the home page tells the story, in the reader's language", async ({ page }) => {
  const external = watchRequests(page);
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1, name: "No pin, no ring" })).toBeVisible();
  for (const name of [
    "The problem",
    "The idea: opt in, not out",
    "How it works",
    "Privacy by design",
    "Getting the word out",
    "The 2026 pilot in Meckenhausen",
    "Run it for your community",
    "What's next",
  ]) {
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  }
  await expect(page.getByText("12 houses put their front door on the map")).toBeVisible();

  await page.getByLabel("Language").selectOption("de");
  await expect(page.getByRole("heading", { level: 1, name: "Keine Stecknadel, kein Klingeln" })).toBeVisible();
  expect(external, "no third-party requests").toEqual([]);
});

test("the demo adds a house by tapping the map, with nothing sent anywhere", async ({ page }) => {
  const external = watchRequests(page);
  const apiCalls: string[] = [];
  page.on("request", (request) => {
    if (/\/spaces\//.test(request.url())) apiCalls.push(request.url());
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await expect(page.getByText("No houses yet.")).toBeVisible();

  await page.getByRole("button", { name: "Add a house" }).click();
  const box = (await page.locator(".maplibregl-canvas").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2 + 40, box.y + box.height / 2);
  await page.getByRole("button", { name: "This is my front door" }).click();
  await page.getByLabel("Name on the map").fill("The Addams Family");
  await page.getByRole("button", { name: "Save my house" }).click();
  await expect(page.getByText("1 house is handing out candy")).toBeVisible();

  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByText("The Addams Family")).toBeVisible();

  await page.getByRole("button", { name: "The rules families see" }).click();
  await expect(page.getByRole("dialog", { name: "Before you head out" })).toBeVisible();
  expect(apiCalls, "no API").toEqual([]);
  expect(external, "no third-party requests").toEqual([]);
});

test("the share page shows the outreach images, and the example privacy notice opens", async ({ page }) => {
  await page.goto("./#/share");
  await expect(page.getByRole("heading", { level: 1, name: "Let your neighbors know" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download" })).toHaveCount(5);
  await expect(page.getByText("halloween.domain.com").first()).toBeVisible();

  await page.goto("./");
  await page.getByRole("link", { name: "Read the example privacy notice" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Privacy notice" })).toBeVisible();
});
