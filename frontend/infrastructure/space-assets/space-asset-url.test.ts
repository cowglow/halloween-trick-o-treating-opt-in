import { describe, expect, it } from "vitest";
import { spaceAssetPath, spaceAssetUrl } from "infrastructure/space-assets/space-asset-url.ts";

describe("spaceAssetPath", () => {
  it("inserts the missing slash when the base has none", () => {
    expect(spaceAssetPath("tiles/a.pmtiles", "/halloween-trick-o-treating-opt-in")).toBe("/halloween-trick-o-treating-opt-in/tiles/a.pmtiles");
  });

  it("does not double the slash when the base already has one", () => {
    expect(spaceAssetPath("tiles/a.pmtiles", "/halloween-trick-o-treating-opt-in/")).toBe("/halloween-trick-o-treating-opt-in/tiles/a.pmtiles");
  });

  it("works for a root base and a leading slash in the path", () => {
    expect(spaceAssetPath("/sw.js", "/")).toBe("/sw.js");
  });
});

describe("spaceAssetUrl", () => {
  it("is absolute (origin + path), as MapLibre requires for sprite and glyph URLs", () => {
    const url = spaceAssetUrl("sprite/sprite", "https://localhost:3000");
    expect(url.startsWith("https://localhost:3000/")).toBe(true);
    expect(url).toBe(`https://localhost:3000${spaceAssetPath("sprite/sprite")}`);
    expect(url.endsWith("/sprite/sprite")).toBe(true);
  });
});
