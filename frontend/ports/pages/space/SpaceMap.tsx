import { ReactNode, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Map as MapLibreMap, type ViewState } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  PMTILES_URL,
  placeholderStyle,
  pmtilesStyle,
  registerPmtilesProtocol,
} from "infrastructure/tile-server/space-map-style.ts";
import { COMMUNITY_MAX_BOUNDS } from "domain/community/community-config.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";

registerPmtilesProtocol();

// Section 5: "set touch-action correctly" so a finger drag/pinch on the map
// pans/zooms it instead of scrolling the page underneath it.
const MAP_CONTAINER_STYLE: CSSProperties = { width: "100%", height: "100%", touchAction: "none" };

function usePmtilesAvailability(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    // A tiny ranged GET, not a HEAD: the service worker only intercepts GETs, so a HEAD always
    // went to the network and failed offline - dropping the map to the placeholder style even
    // though every tile was cached. The worker answers this from its cached copy.
    const controller = new AbortController();
    fetch(PMTILES_URL, { headers: { Range: "bytes=0-0" }, signal: controller.signal })
      .then((res) => {
        controller.abort(); // only the headers matter; don't download a body if the server ignored Range
        // Vite (and most static hosts) answer an unknown path with the app's own index.html and
        // a 200, so "ok" alone can't tell a real archive from a missing one.
        if (!cancelled) setAvailable(res.ok && !(res.headers.get("content-type") ?? "").includes("text/html"));
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);
  return available;
}

interface SpaceMapProps {
  viewState: Pick<ViewState, "longitude" | "latitude" | "zoom">;
  onMove?: (viewState: Pick<ViewState, "longitude" | "latitude" | "zoom">) => void;
  onMoveEnd?: (viewState: Pick<ViewState, "longitude" | "latitude" | "zoom">) => void;
  /** A tap or click on the map, with where it landed. */
  onClick?: (point: { lat: number; lng: number }) => void;
  interactive?: boolean;
  children?: ReactNode;
  ariaLabel?: string;
}

// The one self-hosted map wrapper Spaces uses everywhere (read-only map view,
// pin placement) - registers the pmtiles protocol once, picks the real style
// once the community's .pmtiles file is available or the placeholder otherwise (see
// space-map-style.ts), and always constrains panning/zooming to the
// community's bounding box (docs/SPEC.md section 4: "Set maxBounds on the map").
export default function SpaceMap({
  viewState,
  onMove,
  onMoveEnd,
  onClick,
  interactive = true,
  children,
  ariaLabel,
}: SpaceMapProps) {
  const { t, language } = useTranslation();
  const pmtilesAvailable = usePmtilesAvailability();
  const lang = language === "de" ? "de" : "en";

  const mapStyle = useMemo(
    () => (pmtilesAvailable ? pmtilesStyle(lang, t.spaceApp.attribution) : placeholderStyle()),
    [pmtilesAvailable, lang, t],
  );

  // prefers-reduced-motion (docs/SPEC.md section 5): never animate the camera -
  // every place this map's view changes goes through onMove with `jumpTo`-
  // equivalent instant updates (react-maplibre's controlled viewState), and
  // no flyTo/easeTo call exists anywhere in this feature.
  const prefersReducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  return (
    <MapLibreMap
      mapStyle={mapStyle}
      longitude={viewState.longitude}
      latitude={viewState.latitude}
      zoom={viewState.zoom}
      minZoom={13}
      maxZoom={19}
      maxBounds={COMMUNITY_MAX_BOUNDS}
      dragPan={interactive}
      dragRotate={false}
      touchZoomRotate={interactive}
      scrollZoom={interactive}
      doubleClickZoom={interactive}
      keyboard={interactive}
      attributionControl={{ compact: false }}
      style={MAP_CONTAINER_STYLE}
      aria-label={ariaLabel}
      onMove={onMove ? (event) => onMove(event.viewState) : undefined}
      onMoveEnd={onMoveEnd ? (event) => onMoveEnd(event.viewState) : undefined}
      onClick={onClick ? (event) => onClick({ lat: event.lngLat.lat, lng: event.lngLat.lng }) : undefined}
      // No transition/duration anywhere - matches prefersReducedMotion by
      // construction rather than branching on it, since this map never
      // animates in the first place (see the comment above).
      data-reduced-motion={prefersReducedMotion ? "true" : "false"}
    >
      {children}
    </MapLibreMap>
  );
}
