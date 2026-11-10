// Renders the WhatsApp status images (1080x1920 PNGs) for the share page,
// "Let your neighbors know", into public/whatsapp/<image>-<language>.png,
// from the templates in scripts/whatsapp/templates/. "{{community}}" becomes
// community/community.json's name, "{{url}}" the address people should open.
// The fonts are the app's own (@fontsource), embedded, so nothing is fetched.
//
//   pnpm images:whatsapp -- --url halloween.example.org
//
// Without --url the images say halloween.domain.com. Long community names
// may not fit the date pill: check the images after rendering.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const TEMPLATES = join(ROOT, "scripts/whatsapp/templates");
const OUT = join(ROOT, "public/whatsapp");

const urlFlag = process.argv.indexOf("--url");
const url = (urlFlag !== -1 ? process.argv[urlFlag + 1] : undefined) ?? "halloween.domain.com";
const { name } = JSON.parse(readFileSync(join(ROOT, "community/community.json"), "utf-8"));

const font = (family, file, weight) => {
  const data = readFileSync(join(ROOT, "node_modules/@fontsource", family.toLowerCase(), "files", file)).toString("base64");
  return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${data}) format('woff2');}`;
};
const fonts = [
  font("Fredoka", "fredoka-latin-500-normal.woff2", 500),
  font("Fredoka", "fredoka-latin-600-normal.woff2", 600),
  font("Fredoka", "fredoka-latin-700-normal.woff2", 700),
  font("Nunito", "nunito-latin-400-normal.woff2", 400),
  font("Nunito", "nunito-latin-600-normal.woff2", 600),
  font("Nunito", "nunito-latin-700-normal.woff2", 700),
].join("");

// Text, not markup: the name and address go into HTML.
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
for (const file of readdirSync(TEMPLATES).filter((f) => f.endsWith(".html")).sort()) {
  const template = readFileSync(join(TEMPLATES, file), "utf-8");
  const lang = template.match(/<!-- lang: (\w+) -->/)?.[1] ?? "en";
  const body = template.replaceAll("{{community}}", escape(name)).replaceAll("{{url}}", escape(url));
  await page.setContent(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${fonts}body{margin:0}</style></head><body>${body}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  writeFileSync(join(OUT, file.replace(/\.html$/, ".png")), png);
  console.log(`public/whatsapp/${file.replace(/\.html$/, ".png")}`);
}
await browser.close();
