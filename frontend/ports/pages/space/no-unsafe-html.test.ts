import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// docs/SPEC.md section 8: "Add tests that <script>/<img onerror> payloads render
// as inert text." This app's vitest setup only runs *.test.ts, not *.tsx (see
// CLAUDE.md), so there's no component-rendering/jsdom harness to mount
// LocationsMapView/LocationsListView and assert on the DOM - a real render
// test belongs in e2e/*.spec.ts instead (Playwright, against a live
// frontend+backend). This is the *.test.ts-compatible complement: a static
// guarantee, across every file in this feature, that label/note (or any
// other participant-controlled string) is never routed through `innerHTML`,
// `dangerouslySetInnerHTML`, or MapLibre's `Popup#setHTML` - the exact three
// APIs that would turn a "<script>"/"<img onerror>" payload into executing
// markup instead of inert text. If nobody ever calls those APIs, no payload
// can ever become markup, in this file or the next one added later.
// Matches actual usage (a JSX prop or object-literal assignment / a method
// call), not just the word appearing in a comment explaining why it's
// forbidden - this file's own doc comments (and this file's own pattern
// list) say these names out loud, so a bare substring match would flag
// itself.
const FORBIDDEN_PATTERNS = [/dangerouslySetInnerHTML\s*[=:]/, /\.innerHTML\s*=/, /\.setHTML\(/];

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    // Excludes *.test.ts - this file included, which would otherwise flag
    // itself for containing the very patterns it's checking for.
    if (entry.name.endsWith(".test.ts")) return [];
    if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) return [path];
    return [];
  });
}

describe("Space pages never render user content as HTML", () => {
  const dir = join(import.meta.dirname, ".");
  const files = collectSourceFiles(dir);

  test("found the feature's source files (sanity check the scan isn't vacuous)", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const file of files) {
    test(`${file.replace(dir, ".")} never uses innerHTML/dangerouslySetInnerHTML/setHTML`, () => {
      const source = readFileSync(file, "utf-8");
      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(pattern.test(source)).toBe(false);
      }
    });
  }
});
