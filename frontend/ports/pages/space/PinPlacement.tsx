import { useCallback, useEffect, useMemo, useState } from "react";
import SpaceMap from "ports/pages/space/SpaceMap.tsx";
import SpacePinIcon from "ports/pages/space/SpacePinIcon.tsx";
import { Icon } from "ports/pages/space/Icons.tsx";
import { COMMUNITY_CENTER, isInsideCommunity } from "domain/community/community-config.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { CENTER_MARKER } from "ports/pages/space/space-inline-styles.ts";

interface PinPlacementProps {
  initial?: { lat: number; lng: number };
  onConfirm: (coords: { lat: number; lng: number }) => void;
  onCancel: () => void;
}

const DEFAULT_ZOOM = 17;
const NUDGE_METERS = 2;
const METERS_PER_DEGREE_LAT = 111_320;
const OUTSIDE_GREY = "#6b6480";

function nudgeDelta(lat: number): { dLat: number; dLng: number } {
  const dLat = NUDGE_METERS / METERS_PER_DEGREE_LAT;
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180);
  const dLng = NUDGE_METERS / metersPerDegreeLng;
  return { dLat, dLng };
}

function formatCoordinate(value: number): string {
  return value.toFixed(5);
}

// Step 1 of adding a house. docs/SPEC.md section 5: mouse (drag the map under
// the marker), touch (pan/pinch, see SpaceMap's touch-action), and keyboard
// (MapLibre's built-in arrow-key pan / +/- zoom on the focused map, plus
// these explicit nudge buttons and a Confirm button reachable by Tab) must
// all work equally. The marker itself never moves on screen - it's pinned at
// the map's visual center, and it's the *map* that moves underneath it, so
// the candidate coordinate is always just "whatever the map's current center is."
// A tap or click on the map is the quick way: the map jumps (no animation,
// like everywhere else) so the tapped spot is under the marker.
export default function PinPlacement({ initial, onConfirm, onCancel }: PinPlacementProps) {
  const { t } = useTranslation();
  const start = initial ?? COMMUNITY_CENTER;
  const [viewState, setViewState] = useState({ longitude: start.lng, latitude: start.lat, zoom: DEFAULT_ZOOM });
  const [announced, setAnnounced] = useState({ lat: start.lat, lng: start.lng });
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const inside = useMemo(() => isInsideCommunity(viewState.latitude, viewState.longitude), [viewState]);
  const announcedInside = useMemo(
    () => isInsideCommunity(announced.lat, announced.lng),
    [announced],
  );

  // Announce on move-end / nudge rather than on every intermediate drag frame -
  // a screen reader re-reading the live region on every pixel of a drag would
  // be unusable noise.
  const announce = useCallback((lat: number, lng: number) => {
    setAnnounced({ lat, lng });
  }, []);

  const nudge = useCallback(
    (direction: "N" | "S" | "E" | "W") => {
      const { dLat, dLng } = nudgeDelta(viewState.latitude);
      const next = {
        ...viewState,
        latitude: viewState.latitude + (direction === "N" ? dLat : direction === "S" ? -dLat : 0),
        longitude: viewState.longitude + (direction === "E" ? dLng : direction === "W" ? -dLng : 0),
      };
      setViewState(next);
      announce(next.latitude, next.longitude);
    },
    [viewState, announce],
  );

  const handleTap = useCallback(
    (point: { lat: number; lng: number }) => {
      setViewState((v) => ({ ...v, latitude: point.lat, longitude: point.lng }));
      announce(point.lat, point.lng);
    },
    [announce],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const recenterOnVillage = () => {
    setViewState((v) => ({ ...v, latitude: COMMUNITY_CENTER.lat, longitude: COMMUNITY_CENTER.lng }));
    announce(COMMUNITY_CENTER.lat, COMMUNITY_CENTER.lng);
  };

  const handleUseMyLocation = () => {
    setLocateError(null);
    if (!navigator.geolocation) {
      setLocateError(t.spaceApp.locateFailed);
      recenterOnVillage();
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        if (!isInsideCommunity(next.latitude, next.longitude)) {
          // Someone elsewhere (or a spoofed fix): jumping the map there would leave a blank grey
          // map with no landmarks. Same fallback as a denied fix, plus an explanation.
          setLocateError(t.spaceApp.locateOutside);
          recenterOnVillage();
          return;
        }
        setViewState((v) => ({ ...v, ...next }));
        announce(next.latitude, next.longitude);
      },
      () => {
        // Denied or unavailable falls back to the village center (docs/SPEC.md
        // section 1), never silently stays wherever the map already was -
        // that would look like the button silently did nothing.
        setLocating(false);
        setLocateError(t.spaceApp.locateFailed);
        recenterOnVillage();
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="map-screen">
      <header className="top-bar">
        <div className="grow">
          <small>{t.spaceApp.stepOf(1, 2)}</small>
          <h1>{t.spaceApp.placementTitle}</h1>
        </div>
        <button type="button" className="secondary outline" onClick={onCancel}>
          {t.common.cancel}
        </button>
      </header>

      <div className="map-area">
        <SpaceMap
          viewState={viewState}
          onMove={setViewState}
          onMoveEnd={(view) => announce(view.latitude, view.longitude)}
          onClick={handleTap}
          ariaLabel={t.spaceApp.placementInstructions}
        />
        <div style={CENTER_MARKER} aria-hidden>
          <SpacePinIcon variant="center" color={inside ? undefined : OUTSIDE_GREY} size={44} />
        </div>
        <div className="nudge-pad" role="group" aria-label={t.spaceApp.nudgeLabel}>
          <button type="button" onClick={() => nudge("N")} aria-label={t.spaceApp.nudgeNorth}>
            <Icon name="up" size={18} />
          </button>
          <button type="button" onClick={() => nudge("W")} aria-label={t.spaceApp.nudgeWest}>
            <Icon name="left" size={18} />
          </button>
          <button type="button" onClick={() => nudge("E")} aria-label={t.spaceApp.nudgeEast}>
            <Icon name="right" size={18} />
          </button>
          <button type="button" onClick={() => nudge("S")} aria-label={t.spaceApp.nudgeSouth}>
            <Icon name="down" size={18} />
          </button>
        </div>
      </div>

      <div className="bottom-bar">
        <p className="sr-only">{t.spaceApp.placementInstructions}</p>
        <p role="status" aria-live="polite" className="sr-only">
          {t.spaceApp.positionAnnouncement(formatCoordinate(announced.lat), formatCoordinate(announced.lng), announcedInside)}
        </p>
        <p>
          <strong>
            <Icon name={inside ? "check" : "info"} size={18} /> {inside ? t.spaceApp.statusInside : t.spaceApp.statusOutside}
          </strong>
        </p>
        {locateError ? <p role="alert">{locateError}</p> : null}
        <div className="actions">
          <button type="button" className="secondary outline" onClick={handleUseMyLocation} aria-busy={locating} disabled={locating}>
            {locating ? t.spaceApp.locatingMe : t.spaceApp.useMyLocation}
          </button>
          <button
            type="button"
            disabled={!inside}
            onClick={() => onConfirm({ lat: viewState.latitude, lng: viewState.longitude })}
          >
            {t.spaceApp.confirmLocation}
          </button>
        </div>
      </div>
    </div>
  );
}
