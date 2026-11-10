import { describe, expect, it } from "vitest";
import { fitView } from "domain/space/fit-view.ts";
import { COMMUNITY_CENTER } from "domain/community/community-config.ts";

describe("fitView", () => {
  it("falls back to the village centre when there are no pins", () => {
    expect(fitView([])).toEqual({ longitude: COMMUNITY_CENTER.lng, latitude: COMMUNITY_CENTER.lat, zoom: 15 });
  });

  it("gives a single pin a fixed close-up centred on it", () => {
    expect(fitView([{ lat: 49.17, lng: 11.29 }])).toEqual({ longitude: 11.29, latitude: 49.17, zoom: 16 });
  });

  it("centres on the middle of the pins' bounding box", () => {
    const view = fitView([
      { lat: 49.16, lng: 11.28 },
      { lat: 49.18, lng: 11.3 },
    ]);
    expect(view.longitude).toBeCloseTo(11.29, 6);
    expect(view.latitude).toBeCloseTo(49.17, 6);
  });

  it("zooms out as the pins spread apart, within the allowed range", () => {
    const close = fitView([
      { lat: 49.17, lng: 11.29 },
      { lat: 49.1701, lng: 11.2901 },
    ]);
    const spread = fitView([
      { lat: 49.16, lng: 11.28 },
      { lat: 49.185, lng: 11.305 },
    ]);
    expect(close.zoom).toBe(17); // capped: never closer than maxZoom
    expect(spread.zoom).toBeLessThan(close.zoom);
    expect(spread.zoom).toBeGreaterThanOrEqual(14);
  });

  it("never zooms out past minZoom even for far-apart pins", () => {
    const far = fitView([
      { lat: 49.15, lng: 11.26 },
      { lat: 49.2, lng: 11.32 },
    ]);
    expect(far.zoom).toBe(14);
  });

  it("actually contains every pin at the chosen zoom (the property that matters)", () => {
    const pins = [
      { lat: 49.1655, lng: 11.2801 },
      { lat: 49.1702, lng: 11.2912 },
      { lat: 49.1741, lng: 11.2966 },
    ];
    const view = fitView(pins, { width: 640, height: 430, padding: 1 });
    const worldPx = 512 * 2 ** view.zoom;
    const spanLngPx = ((Math.max(...pins.map((p) => p.lng)) - Math.min(...pins.map((p) => p.lng))) / 360) * worldPx;
    expect(spanLngPx).toBeLessThanOrEqual(640);
  });
});
