import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Links to other sites open in a new window with rel="noopener nofollow",
// through ExternalLink. A plain <a> is fine only for the site's own files
// (the WhatsApp image downloads, href={src}).
const ALLOWED_PLAIN_HREFS = [/href=\{src\}/];

function collectTsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectTsx(path);
    return entry.name.endsWith(".tsx") && entry.name !== "ExternalLink.tsx" ? [path] : [];
  });
}

describe("External links", () => {
  const dir = import.meta.dirname;
  const files = collectTsx(dir);

  test("found the pages (the scan isn't vacuous)", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    test(`${file.replace(dir, ".")} links off the site only through ExternalLink`, () => {
      const source = readFileSync(file, "utf-8");
      const anchors = source.match(/<a\s[^>]*>/g) ?? [];
      for (const anchor of anchors) {
        expect(ALLOWED_PLAIN_HREFS.some((ok) => ok.test(anchor)), anchor).toBe(true);
      }
    });
  }

  test("ExternalLink opens a new window with noopener and nofollow", () => {
    const source = readFileSync(join(dir, "site/ExternalLink.tsx"), "utf-8");
    expect(source).toContain('target="_blank"');
    expect(source).toContain('rel="noopener nofollow"');
  });
});
