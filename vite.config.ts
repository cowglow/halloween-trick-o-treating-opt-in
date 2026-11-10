import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";
import * as path from "node:path";
import * as fs from "node:fs";
import viteBasicSslPlugin from "@vitejs/plugin-basic-ssl";

// `pnpm dev`'s predev hook (scripts/dev-cert-ensure.sh) generates a
// locally-trusted certificate here via mkcert - no browser warning, and no
// permissions (geolocation, etc.) getting reset because the cert changed, the
// way vite-plugin-basic-ssl's ephemeral self-signed one does on every
// restart. Falls back to basic-ssl when the mkcert cert hasn't been
// generated (e.g. inside Docker, where there's no host browser to trust a
// local CA anyway).
const certDir = path.resolve(import.meta.dirname, "cert");
const certFile = path.join(certDir, "localhost.pem");
const keyFile = path.join(certDir, "localhost-key.pem");
const hasMkcertCert = fs.existsSync(certFile) && fs.existsSync(keyFile);

// docs/SPEC.md section 3: a strict CSP - "default-src 'self'; connect-src 'self';
// img-src 'self' data: blob:; worker-src 'self' blob:. Tune only as MapLibre
// requires; document any relaxations." Injected into index.html.
//
// Relaxations beyond the literal baseline, and why each is needed:
// - `connect-src` also allows the API's own origin (VITE_API_URL) - it's a
//   different origin from this static site by design (see
//   ports/http/app.ts's CORS comment), so `'self'` alone would block every
//   sign-in/invite/pin request. Not added when VITE_API_URL is a same-origin
//   path (`pnpm dev:lan`'s `/api` proxy), which `'self'` already covers.
// - `style-src` adds `'unsafe-inline'` - React's `style={{...}}` prop (used
//   throughout this feature, e.g. SpaceMap.tsx) renders as an inline `style=`
//   attribute, which default-src/style-src blocks without it. MapLibre GL JS
//   also sets canvas cursor/transform styles inline internally.
// - `font-src 'self'` for this app's own bundled fonts (@fontsource Fredoka and Nunito).
// - `manifest-src 'self'` for the PWA manifest link.
// Not yet live-verified in a real browser's console for CSP violations (this
// session had no way to drive one) - re-check with devtools open once the
// real .pmtiles/glyph/sprite assets are in place (section 4's blockers),
// since those add `pmtiles://`-protocol fetches and font/sprite requests
// this policy hasn't been exercised against yet.
function spaceCspPlugin(apiOrigin: string): Plugin {
  const csp = [
    "default-src 'self'",
    `connect-src 'self'${/^https?:\/\//.test(apiOrigin) ? ` ${apiOrigin}` : ""}`,
    "img-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "manifest-src 'self'",
  ].join("; ");

  return {
    name: "space-csp",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html.replace(
          "</head>",
          `  <meta http-equiv="Content-Security-Policy" content="${csp}" />\n</head>`,
        );
      },
    },
  };
}

// maplibre-gl 6 loads its tile-decoding web worker as a separate ES module that
// it expects to find next to its own bundled file - which neither Vite's dev
// dependency pre-bundling nor a production build provides, so without this the
// Spaces map fetched tiles but never painted anything (worker URL 404). The
// worker imports ./maplibre-gl-shared.mjs relatively, so both files are served
// (dev) / emitted (build) side by side under maplibre/, and
// infrastructure/tile-server/space-map-style.ts points setWorkerUrl() at them.
const MAPLIBRE_WORKER_FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];
function maplibreWorkerPlugin(base: string): Plugin {
  const distDir = path.resolve(import.meta.dirname, "node_modules/maplibre-gl/dist");
  const urlPrefix = `${base.replace(/\/+$/, "")}/maplibre/`;
  return {
    name: "maplibre-worker",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        const file = MAPLIBRE_WORKER_FILES.find((name) => url === `${urlPrefix}${name}`);
        if (!file) return next();
        res.setHeader("Content-Type", "text/javascript");
        res.end(fs.readFileSync(path.join(distDir, file)));
      });
    },
    generateBundle() {
      for (const name of MAPLIBRE_WORKER_FILES) {
        this.emitFile({
          type: "asset",
          fileName: `maplibre/${name}`,
          source: fs.readFileSync(path.join(distDir, name)),
        });
      }
    },
  };
}

// `pnpm dev:lan` sets VITE_API_URL=/api, so a phone on the LAN talks to one
// HTTPS origin (this dev server) instead of the page being HTTPS and the API
// plain HTTP on :4000, which a phone blocks as mixed content. Dev server only;
// production calls the API's own domain directly. See docs/DEV-HTTPS.md.
const DEV_API_PROXY_PATH = "/api";
const DEV_API_PROXY_TARGET = "http://localhost:4000";

// Where the build is served. The map app: the root of its own domain
// ("/", the default; backend/src/composition-root.ts's CLIENT_APP_PATH must
// match). The project site: its GitHub Pages path (deploy.yml sets VITE_BASE).
const BASE = process.env.VITE_BASE || "/";

// The page title: the community's map (community/community.json), or the
// project site's.
const COMMUNITY_NAME = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "community/community.json"), "utf-8")).name;

function titlePlugin(isSite: boolean): Plugin {
  const title = isSite ? "No pin, no ring · an open-source Halloween map" : `${COMMUNITY_NAME} Halloween Map`;
  return {
    name: "page-title",
    transformIndexHtml: (html) => html.replace(/<title>.*<\/title>/, `<title>${title}</title>`),
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiOrigin = env.VITE_API_URL ?? "http://localhost:4000";

  return {
    base: BASE,
    plugins: [
      tsconfigPaths(),
      react(),
      maplibreWorkerPlugin(BASE),
      checker({ typescript: true }),
      spaceCspPlugin(apiOrigin),
      titlePlugin(env.VITE_SITE === "true"),
      ...(hasMkcertCert ? [] : [viteBasicSslPlugin()]),
    ],
    server: {
      port: 3000,
      proxy: {
        [DEV_API_PROXY_PATH]: {
          target: DEV_API_PROXY_TARGET,
          rewrite: (requestPath) => requestPath.slice(DEV_API_PROXY_PATH.length),
        },
      },
      https: hasMkcertCert ? { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) } : undefined,
    },
    build: {
      // Vite inlines assets under 4 kB as data: URIs, which caught the
      // bundled fonts - and the CSP's `font-src 'self'` blocks
      // data: fonts, so production fell back to Times. Emit fonts as files
      // instead of loosening the CSP; everything else keeps the default.
      assetsInlineLimit: (filePath: string) => (/\.(woff2?|ttf|otf|eot)$/.test(filePath) ? false : undefined),
    },
  };
});
