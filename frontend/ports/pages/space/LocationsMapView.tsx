import { useLayoutEffect, useRef, useState } from "react";
import { Marker, Popup } from "@vis.gl/react-maplibre";
import SpaceMap from "ports/pages/space/SpaceMap.tsx";
import SpacePinIcon from "ports/pages/space/SpacePinIcon.tsx";
import type { SpaceLocation } from "domain/space/space.types.ts";
import { fitView, type FitView } from "domain/space/fit-view.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { MAP_FILL, MARKER_BUTTON, PRE_WRAP } from "ports/pages/space/space-inline-styles.ts";

interface LocationsMapViewProps {
  locations: SpaceLocation[];
  ownParticipantId: string | null;
}

// Read-only view of every participant's pin. Popups render `label`/`note` as
// plain React children (never setHTML/dangerouslySetInnerHTML/innerHTML) -
// React escapes text content by construction, so a label or note containing
// "<script>" or an event handler attribute renders as inert text (docs/SPEC.md
// section 8's XSS requirement; see LocationsMapView.test.tsx).
export default function LocationsMapView({ locations, ownParticipantId }: LocationsMapViewProps) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);

  // The camera lives here: react-maplibre treats longitude/latitude/zoom as *controlled*,
  // so passing a fixed value without an onMove handler froze the map (no drag, no wheel zoom).
  // Start zoomed to fit every pin, so nobody's pin (least of all your own) starts off-screen.
  // The fit needs the map box's real size (a phone's is far narrower than a desktop's), so
  // measure the box first and mount the map once the camera is known.
  const boxRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState<FitView | null>(null);
  useLayoutEffect(() => {
    const box = boxRef.current?.getBoundingClientRect();
    setViewState(fitView(locations, box && box.width > 0 ? { width: box.width, height: box.height } : {}));
    // Only on mount: after that the person moves the camera, and new pins don't yank it around.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!viewState) return <div ref={boxRef} style={MAP_FILL} />;

  return (
    <div ref={boxRef} style={MAP_FILL}>
      <SpaceMap viewState={viewState} onMove={setViewState} ariaLabel={t.spaceApp.mapView}>
        {locations.map((location) => (
          <Marker
            key={location.id}
            longitude={location.lng}
            latitude={location.lat}
            anchor="bottom"
          >
            {/* One handler only: a click here bubbles up to the marker element too, and having
                both toggle the popup opened and immediately re-closed it (it never showed). A real
                <button> also gives Enter/Space and a focus ring for free. */}
            <button
              type="button"
              style={MARKER_BUTTON}
              aria-label={location.label}
              aria-expanded={openId === location.id}
              onClick={() => setOpenId((current) => (current === location.id ? null : location.id))}
            >
              <SpacePinIcon variant={location.participantId === ownParticipantId ? "own" : "participant"} />
            </button>
          </Marker>
        ))}
        {locations
          .filter((location) => location.id === openId)
          .map((location) => (
            <Popup
              key={location.id}
              longitude={location.lng}
              latitude={location.lat}
              anchor="bottom"
              offset={44}
              // A mouse click on a pin is also a click on the map, and popups close on map clicks by
              // default - so it opened and closed in the same gesture. The popup's own X and the
              // pin button (a toggle) close it instead.
              closeOnClick={false}
              onClose={() => setOpenId(null)}
            >
              <strong>{location.label}</strong>
              {location.note ? <p style={PRE_WRAP}>{location.note}</p> : null}
            </Popup>
          ))}
      </SpaceMap>
    </div>
  );
}
