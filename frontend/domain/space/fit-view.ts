import { COMMUNITY_CENTER } from "domain/community/community-config.ts";

export interface FitViewOptions {
  /** Size of the map box in CSS pixels (a conservative guess is fine: it only picks a zoom). */
  width?: number;
  height?: number;
  minZoom?: number;
  maxZoom?: number;
  /** >1 leaves a margin around the outermost pins. */
  padding?: number;
}

export interface FitView {
  longitude: number;
  latitude: number;
  zoom: number;
}

// Web-Mercator "y" for a latitude in degrees (the vertical axis MapLibre actually uses).
function mercatorY(lat: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

// A camera that shows every point: centred on their bounding box, at the highest zoom where the
// box still fits. MapLibre's world is 512 * 2^zoom pixels wide, which is what the two log2 lines
// solve for. One point (or none) gets a sensible fixed close-up instead of "infinite zoom".
export function fitView(points: readonly { lat: number; lng: number }[], options: FitViewOptions = {}): FitView {
  const { width = 640, height = 430, minZoom = 14, maxZoom = 17, padding = 1.4 } = options;

  if (points.length === 0) return { longitude: COMMUNITY_CENTER.lng, latitude: COMMUNITY_CENTER.lat, zoom: 15 };
  if (points.length === 1) return { longitude: points[0].lng, latitude: points[0].lat, zoom: 16 };

  const lngs = points.map((p) => p.lng);
  const lats = points.map((p) => p.lat);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  const south = Math.min(...lats);
  const north = Math.max(...lats);

  const lngSpan = (east - west) * padding;
  const ySpan = (mercatorY(north) - mercatorY(south)) * padding;

  const zoomForLng = lngSpan > 0 ? Math.log2((width * 360) / (512 * lngSpan)) : maxZoom;
  const zoomForLat = ySpan > 0 ? Math.log2((height * 2 * Math.PI) / (512 * ySpan)) : maxZoom;
  const zoom = Math.min(maxZoom, Math.max(minZoom, Math.min(zoomForLng, zoomForLat)));

  return { longitude: (west + east) / 2, latitude: (south + north) / 2, zoom };
}
