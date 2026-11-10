import { describe, expect, test } from "vitest";
import { isAppCacheName } from "infrastructure/service-worker/app-caches.ts";

describe("isAppCacheName", () => {
  test("matches this app's caches, current and legacy", () => {
    expect(isAppCacheName("halloween-map-v6")).toBe(true);
    expect(isAppCacheName("map-v5")).toBe(true);
  });

  test("leaves other sites' caches on the shared origin alone", () => {
    expect(
      isAppCacheName("workbox-precache-v2-https://cowglow.github.io/"),
    ).toBe(false);
    expect(isAppCacheName("my-map-v1")).toBe(false);
    expect(isAppCacheName("map-v5-other")).toBe(false);
  });
});
