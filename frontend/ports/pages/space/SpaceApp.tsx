import { Navigate, Route, Routes } from "react-router-dom";
import MapHomePage from "ports/pages/space/MapHomePage.tsx";
import InviteAcceptPage from "ports/pages/space/InviteAcceptPage.tsx";
import PrivacyNoticePage from "ports/pages/space/PrivacyNoticePage.tsx";
import RequestAccessPage from "ports/pages/space/RequestAccessPage.tsx";
import ShareResourcesPage from "ports/pages/space/ShareResourcesPage.tsx";
import ClosedPage from "ports/pages/space/ClosedPage.tsx";
import { hasEventEnded } from "domain/space/event-end.ts";
import { EVENT_END } from "ports/pages/space/event-config.ts";
import { DEFAULT_SPACE_SLUG, spacePaths } from "ports/pages/space/space-routes.ts";

// "/" redirects to the one space this deployment serves - there's no more
// self-serve "create a space" page (docs/SPEC.md section 2: "NO public access").
// Once the event is over every address shows that the map has closed (the
// server is gone by then), except the privacy notice. Checked when the app loads.
export default function SpaceApp() {
  if (hasEventEnded(EVENT_END)) {
    return (
      <Routes>
        <Route path="/:spaceSlug/privacy" element={<PrivacyNoticePage />} />
        <Route path="*" element={<ClosedPage />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<Navigate to={spacePaths.home(DEFAULT_SPACE_SLUG)} replace />} />
      <Route path="/:spaceSlug" element={<MapHomePage />} />
      <Route path="/:spaceSlug/invite" element={<InviteAcceptPage />} />
      <Route path="/:spaceSlug/privacy" element={<PrivacyNoticePage />} />
      <Route path="/:spaceSlug/request-access" element={<RequestAccessPage />} />
      <Route path="/:spaceSlug/share" element={<ShareResourcesPage />} />
    </Routes>
  );
}
