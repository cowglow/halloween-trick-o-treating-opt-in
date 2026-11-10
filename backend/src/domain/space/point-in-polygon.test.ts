import { describe, expect, test } from "vitest";
import { isInsideBoundary, isPointInPolygon } from "./point-in-polygon.js";

// A community boundary like community.json's (Meckenhausen's bounding box).
const BBOX = { south: 49.1518269, north: 49.1918269, west: 11.2690778, east: 11.3090778 };
const CENTER = { lat: 49.1718269, lng: 11.2890778 };
const RING: [number, number][] = [
  [BBOX.west, BBOX.south],
  [BBOX.east, BBOX.south],
  [BBOX.east, BBOX.north],
  [BBOX.west, BBOX.north],
  [BBOX.west, BBOX.south],
];
const isInside = (lat: number, lng: number) => isInsideBoundary(RING, lat, lng);

describe("isPointInPolygon", () => {
  const square = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ] as const;

  test("a point in the middle is inside", () => {
    expect(isPointInPolygon([5, 5], square)).toBe(true);
  });

  test("a point well outside is outside", () => {
    expect(isPointInPolygon([50, 50], square)).toBe(false);
    expect(isPointInPolygon([-5, 5], square)).toBe(false);
  });

  test("a concave polygon correctly excludes points in the notch", () => {
    // A "C" shape: outer square with a rectangular bite taken out of the right side.
    const cShape = [
      [0, 0],
      [10, 0],
      [10, 4],
      [4, 4],
      [4, 6],
      [10, 6],
      [10, 10],
      [0, 10],
      [0, 0],
    ] as const;

    expect(isPointInPolygon([8, 5], cShape)).toBe(false); // inside the bite
    expect(isPointInPolygon([2, 5], cShape)).toBe(true); // inside the solid part
  });
});

describe("isInsideBoundary", () => {
  test("the village center is inside", () => {
    expect(isInside(CENTER.lat, CENTER.lng)).toBe(true);
  });

  test("a point well outside the bbox is outside", () => {
    expect(isInside(48.1, 10.0)).toBe(false);
  });

  test("just inside each edge of the bbox is inside", () => {
    expect(isInside(BBOX.south + 0.0001, CENTER.lng)).toBe(true);
    expect(isInside(BBOX.north - 0.0001, CENTER.lng)).toBe(true);
    expect(isInside(CENTER.lat, BBOX.west + 0.0001)).toBe(true);
    expect(isInside(CENTER.lat, BBOX.east - 0.0001)).toBe(true);
  });

  test("just outside each edge of the bbox is outside", () => {
    expect(isInside(BBOX.south - 0.01, CENTER.lng)).toBe(false);
    expect(isInside(BBOX.north + 0.01, CENTER.lng)).toBe(false);
    expect(isInside(CENTER.lat, BBOX.west - 0.01)).toBe(false);
    expect(isInside(CENTER.lat, BBOX.east + 0.01)).toBe(false);
  });
});
