// Hand-rolled point-in-polygon (docs/SPEC.md section 4: "no new dependency"). Standard
// ray-casting / even-odd rule: count how many times a ray cast from the point to
// +infinity in x crosses a polygon edge; odd = inside. Works for the rectangle
// boundary.ts currently ships as well as a future real polygon with concave edges.

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

export function isInsideBoundary(ring: Ring, lat: number, lng: number): boolean {
  return isPointInPolygon([lng, lat], ring);
}
