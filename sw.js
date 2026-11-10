// Hand-rolled service worker (docs/SPEC.md section 6 preferred vite-plugin-pwa;
// see docs/WORKLOG.md for why this stayed hand-written).
//
// Strategy: runtime cache-first for the app's own static files, built up
// from actual use rather than a precomputed manifest. That's enough to
// satisfy "after the first visit the map must render with zero tile requests
// to the network" without knowing the build's hashed asset filenames, which
// a static file in public/ can't.
//
// Bump this on any change to the caching *strategy* below (not on every app
// deploy - that would defeat the whole point of caching). It's what makes
// `activate` drop a stale cache instead of accumulating old strategies
// forever. Keep the "halloween-map-" prefix: the production origin
// (cowglow.github.io at first) can be shared with other sites, so `activate` only ever
// deletes this app's own caches (frontend/infrastructure/service-worker/app-caches.ts
// mirrors this). "map-vN" was this app's unprefixed name before.
const CACHE_PREFIX = "halloween-map-";
const CACHE_VERSION = `${CACHE_PREFIX}v6`;
const isAppCache = (name) => name.startsWith(CACHE_PREFIX) || /^map-v\d+$/.test(name);

// The app's base path ("/" on its own domain), taken from the registration
// scope so it isn't hard-coded in two places (vite.config.ts's `base`).
const BASE_PATH = new URL(self.registration.scope).pathname;
const TILES_PATH = `${BASE_PATH}tiles/`;
// Only these are cached. The scope is the whole app, and in dev Vite serves
// source modules (frontend/, @vite/, node_modules/) under the same base;
// caching those cache-first would pin a stale dev build. A production
// build's hashed JS/CSS lives under assets/; without it an offline load
// finds the HTML but none of its scripts.
const CACHED_PREFIXES = ["assets/", "tiles/", "fonts/", "sprite/", "maplibre/", "icon"].map((p) => `${BASE_PATH}${p}`);
const CACHED_FILES = [`${BASE_PATH}manifest.webmanifest`];

self.addEventListener("install", () => {
  // Updates (docs/SPEC.md section 6, "handle service worker updates
  // sensibly"): a new worker activates immediately rather than waiting for
  // every open tab to close, and the HTML is network-first (below), so the
  // next open of the app runs the new version. No "new version, reload"
  // prompt: the build is a single JS bundle with no lazy chunks, so a page
  // still running the old version never requests a file the deploy removed,
  // and nobody keeps this app open across a deploy for long.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => isAppCache(name) && name !== CACHE_VERSION).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

// docs/SPEC.md section 6: "make sure Range requests are answered from cache" for
// the .pmtiles archive (which pmtiles' Protocol fetches in byte-range chunks,
// not as one request - see infrastructure/tile-server/space-map-style.ts).
// The trick: cache the *whole* file once, ignoring any Range header on the
// way in, then answer every subsequent ranged request by slicing that cached
// full response in memory - so the archive is downloaded from the network
// at most once, and every tile after that is served from disk, byte-range
// intact.
async function handleRangeableRequest(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cacheKey = new Request(request.url); // strips the Range header for the cache key
  let full = await cache.match(cacheKey);

  if (!full) {
    const response = await fetch(cacheKey); // unranged - the complete file
    // Never cache the HTML fallback a server returns for a missing archive -
    // cache-first would then serve that HTML as "tiles" forever.
    if (!response.ok || (response.headers.get("content-type") ?? "").includes("text/html")) return response;
    await cache.put(cacheKey, response.clone());
    full = response;
  }

  const rangeHeader = request.headers.get("range");
  if (!rangeHeader) return full;

  const buffer = await full.clone().arrayBuffer();
  const match = /bytes=(\d+)-(\d+)?/.exec(rangeHeader);
  if (!match) return full;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : buffer.byteLength - 1;
  const slice = buffer.slice(start, end + 1);

  const headers = new Headers(full.headers);
  headers.set("Content-Range", `bytes ${start}-${end}/${buffer.byteLength}`);
  headers.set("Content-Length", String(slice.byteLength));
  return new Response(slice, { status: 206, statusText: "Partial Content", headers });
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

// The HTML document has no content hash in its URL, so cache-first would pin
// users to whichever index.html they first loaded (and with it, the old
// hashed JS bundle) forever. Network-first keeps deploys reaching users;
// the cached copy is only the offline fallback.
async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only ever cache same-origin GET requests - every write (POST/PATCH/DELETE)
  // and every request to the API's own origin (a different origin from this
  // static site - see ports/http/app.ts's CORS comment) passes straight
  // through untouched.
  // That includes the magic-link/invite-accept calls themselves (docs/SPEC.md:
  // "Magic-link callback routes are network-only and never cached") - they
  // hit the API origin, which this check already excludes. (Under `pnpm
  // dev:lan` the API is same-origin at /api/, outside every cached prefix
  // below, so it still passes through.)
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirst(request));
    return;
  }

  const cacheable =
    CACHED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) || CACHED_FILES.includes(url.pathname);
  if (!cacheable) return;

  if (url.pathname.startsWith(TILES_PATH)) {
    event.respondWith(handleRangeableRequest(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
