import type { SpaceLocation } from "domain/space/space.types.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { PRE_WRAP } from "ports/pages/space/space-inline-styles.ts";

interface LocationsListViewProps {
  locations: SpaceLocation[];
  ownParticipantId: string | null;
}

// docs/SPEC.md section 1: "A map/list toggle switches between the map and a
// plain text list of the pins" - this is that list: a plain, accessible,
// non-map fallback showing the same label/note data as the map's popups,
// rendered as ordinary text (React children, never innerHTML - see
// LocationsMapView.tsx's comment).
export default function LocationsListView({ locations, ownParticipantId }: LocationsListViewProps) {
  const { t } = useTranslation();

  if (locations.length === 0) {
    return (
      <div className="list-view">
        <p>{t.spaceApp.noLocationsYet}</p>
      </div>
    );
  }

  const sorted = [...locations].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <ul className="list-view" role="list">
      {sorted.map((location) => (
        <li key={location.id}>
          <article>
            <strong>{location.label}</strong>
            {location.participantId === ownParticipantId ? <small> ({t.spaceApp.yourHouse})</small> : null}
            {location.note ? <p style={PRE_WRAP}>{location.note}</p> : null}
          </article>
        </li>
      ))}
    </ul>
  );
}
