import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import SpaceApp from "ports/pages/space/SpaceApp.tsx";
import SiteApp from "ports/pages/site/SiteApp.tsx";
import { I18nContextProvider } from "ports/context/i18n/i18n.provider.tsx";
import { registerSpaceServiceWorker } from "infrastructure/service-worker/register-space-service-worker.ts";
import "@picocss/pico/css/pico.min.css";
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/fredoka/latin-600.css";
import "ports/pages/space/app.css";

// One codebase, two builds: the community's map app, or (VITE_SITE=true) the
// project site with its in-browser demo. The site needs no offline cache.
const IS_SITE = import.meta.env.VITE_SITE === "true";

if (!IS_SITE) registerSpaceServiceWorker();

// The app mounts at the root of its own HashRouter (see index.html).
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nContextProvider>
      <HashRouter>
        {IS_SITE ? <SiteApp /> : <SpaceApp />}
      </HashRouter>
    </I18nContextProvider>
  </React.StrictMode>,
);
