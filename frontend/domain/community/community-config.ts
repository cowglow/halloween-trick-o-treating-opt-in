import raw from "community/community.json";
import { isPointInPolygon } from "domain/space/point-in-polygon.ts";

// Where and when this map runs: community/community.json (see its README),
// bundled at build time. Mirrors backend/src/infrastructure/config/community.ts,
// which reads the same file at startup.
export type CommunityConfig = {
  name: string;
  slug: string;
  organizer: string;
  hostingProvider: string;
  timeZone: string;
  eventEndAt: string;
  defaultLanguage: "en" | "de" | "es";
  map: {
    center: { lat: number; lng: number };
    /** [lng, lat] pairs, GeoJSON winding, first point repeated at the end. */
    boundary: [number, number][];
    tiles: string;
  };
};

export const COMMUNITY = raw as CommunityConfig;

export const COMMUNITY_CENTER = COMMUNITY.map.center;
export const COMMUNITY_BOUNDARY_RING: readonly (readonly [number, number])[] = COMMUNITY.map.boundary;

// MapLibre's maxBounds, flat [west, south, east, north]: the boundary's
// bounding box, so the map can't be panned away from the community.
export const COMMUNITY_MAX_BOUNDS: [number, number, number, number] = [
  Math.min(...COMMUNITY.map.boundary.map(([lng]) => lng)),
  Math.min(...COMMUNITY.map.boundary.map(([, lat]) => lat)),
  Math.max(...COMMUNITY.map.boundary.map(([lng]) => lng)),
  Math.max(...COMMUNITY.map.boundary.map(([, lat]) => lat)),
];

/** Whether a point is inside the community's boundary (the server checks too). */
export function isInsideCommunity(lat: number, lng: number): boolean {
  return isPointInPolygon([lng, lat], COMMUNITY_BOUNDARY_RING);
}
