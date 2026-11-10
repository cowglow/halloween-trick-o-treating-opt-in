import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import type { SpaceLocation } from "domain/space/space.types.ts";
import PinPlacement from "ports/pages/space/PinPlacement.tsx";
import LocationForm from "ports/pages/space/LocationForm.tsx";
import LocationsMapView from "ports/pages/space/LocationsMapView.tsx";
import LocationsListView from "ports/pages/space/LocationsListView.tsx";
import RulesDialog from "ports/pages/space/RulesDialog.tsx";
import { Icon, Pumpkin } from "ports/pages/space/Icons.tsx";
import { sitePaths } from "ports/pages/site/site-links.ts";

type Mode = "view" | "placing" | "form";

// The map, with the app's own screens (placing a house, its name and note,
// the map and list, the rules), but the houses live only in this component:
// no account, no server, no default markers that could be anyone's real
// house. A reload empties it.
export default function DemoPage() {
  const { t } = useTranslation();
  const s = t.spaceSite;
  const [locations, setLocations] = useState<SpaceLocation[]>([]);
  const [mode, setMode] = useState<Mode>("view");
  const [placed, setPlaced] = useState<{ lat: number; lng: number } | null>(null);
  const [view, setView] = useState<"map" | "list">("map");
  const [showRules, setShowRules] = useState(false);

  const addHouse = async ({ label, note }: { label: string; note: string }) => {
    if (!placed) return;
    const now = new Date().toISOString();
    const id = `demo-${locations.length + 1}`;
    setLocations((current) => [
      ...current,
      { id, spaceId: "demo", participantId: id, label, note, lat: placed.lat, lng: placed.lng, createdAt: now, updatedAt: now },
    ]);
    setMode("view");
  };

  if (mode === "placing") {
    return (
      <PinPlacement
        onConfirm={(coords) => {
          setPlaced(coords);
          setMode("form");
        }}
        onCancel={() => setMode("view")}
      />
    );
  }
  if (mode === "form") {
    return <LocationForm onSubmit={addHouse} onBack={() => setMode("placing")} submitting={false} error={null} />;
  }

  return (
    <div className="map-screen">
      <header className="top-bar">
        <Pumpkin size={30} />
        <div className="grow">
          <h1>{s.demoTitle}</h1>
          <small>
            <Link to={sitePaths.home}>{s.backToSite}</Link>
          </small>
        </div>
      </header>

      <div className="map-area">
        {view === "map" ? (
          // Remounts when a house is added, so the map fits every pin.
          <LocationsMapView key={locations.length} locations={locations} ownParticipantId={null} />
        ) : (
          <LocationsListView locations={locations} ownParticipantId={null} />
        )}
        <div className="floating">
          <div role="group" aria-label={t.spaceApp.viewLabel}>
            <button
              type="button"
              aria-pressed={view === "map"}
              className={view === "map" ? "secondary" : "secondary outline"}
              onClick={() => setView("map")}
            >
              {t.spaceApp.mapView}
            </button>
            <button
              type="button"
              aria-pressed={view === "list"}
              className={view === "list" ? "secondary" : "secondary outline"}
              onClick={() => setView("list")}
            >
              {t.spaceApp.listView}
            </button>
          </div>
          <span className="chip">{t.spaceApp.housesCount(locations.length)}</span>
          <p className="notice">{locations.length === 0 ? s.demoEmpty : s.demoNotice}</p>
        </div>
      </div>

      <div className="bottom-bar">
        <div className="actions">
          <button type="button" onClick={() => setMode("placing")}>
            <Icon name="plus" size={20} /> {s.demoAddHouse}
          </button>
          <button type="button" className="secondary outline" onClick={() => setShowRules(true)}>
            {s.demoRules}
          </button>
        </div>
      </div>
      {showRules ? <RulesDialog onClose={() => setShowRules(false)} /> : null}
    </div>
  );
}
