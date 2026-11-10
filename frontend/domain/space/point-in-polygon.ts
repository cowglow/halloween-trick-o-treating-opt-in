// Mirrors backend/src/domain/space/point-in-polygon.ts exactly - client-side
// validation is a UX nicety (instant "outside the map area" feedback while
// dragging), the server check is the actual boundary (docs/SPEC.md section 4:
// "validate pins against the boundary on client AND server").
export type Ring = readonly (readonly [number, number])[];

export function isPointInPolygon(point: readonly [number, number], ring: Ring): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}
