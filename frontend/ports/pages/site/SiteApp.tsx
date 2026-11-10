import { Navigate, Route, Routes } from "react-router-dom";
import SiteHomePage from "ports/pages/site/SiteHomePage.tsx";
import DemoPage from "ports/pages/site/DemoPage.tsx";
import SiteSharePage from "ports/pages/site/SiteSharePage.tsx";
import PrivacyNoticePage from "ports/pages/space/PrivacyNoticePage.tsx";

// The project site (a build with VITE_SITE=true, see spaces-main.tsx): the
// documentation, a demo of the map that runs only in the browser, the share
// page, and the example privacy notice. No server, no API calls.
export default function SiteApp() {
  return (
    <Routes>
      <Route path="/" element={<SiteHomePage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/share" element={<SiteSharePage />} />
      <Route path="/:spaceSlug/privacy" element={<PrivacyNoticePage />} />
      {/* The privacy notice's "back to the map" link. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
