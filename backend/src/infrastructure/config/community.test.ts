import { describe, expect, it } from "vitest";
import { COMMUNITY, parseCommunityConfig } from "./community.js";

describe("community config", () => {
  it("loads the repo's community/community.json", () => {
    expect(COMMUNITY.slug).toBe("meckenhausen");
    expect(COMMUNITY.map.boundary.length).toBeGreaterThanOrEqual(4);
  });

  it("says which field is wrong", () => {
    expect(() => parseCommunityConfig({ ...COMMUNITY, timeZone: "Mars/Olympus" })).toThrow(/timeZone/);
    expect(() => parseCommunityConfig({ ...COMMUNITY, slug: "Not A Slug" })).toThrow(/slug/);
    expect(() => parseCommunityConfig({ ...COMMUNITY, defaultLanguage: "fr" })).toThrow(/defaultLanguage/);
  });
});
