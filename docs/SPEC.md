# Meckenhausen Halloween map: product spec

The requirements this app is built against. They are implemented except where
the open items in `TASK.md` say otherwise; deliberate deviations and the
reasons for them are in `docs/WORKLOG.md`:

- The village boundary is a bbox, not a polygon (OSM has no polygon for the
  Ortsteil), and it doubles as the map's `maxBounds`.
- The service worker is hand-written, not `vite-plugin-pwa`.
- The CSP adds the API origin to `connect-src`, plus `'unsafe-inline'` styles,
  `font-src 'self'` and `manifest-src 'self'` (see `vite.config.ts`).
- One pin per participant.

## 1. Product
A trick-or-treat neighborhood map for Meckenhausen (Ortsteil of Hilpoltstein,
Landkreis Roth, Bavaria): Postgres/Prisma, a Hetzner-hosted API, and
magic-link auth.
- The map is the home page. A map/list toggle switches between the map and a
  plain text list of the pins.
- NO typed addresses and NO geocoding. A participant places a pin by moving the
  map under a fixed center marker. "Use my location" pre-centers the map, only
  when the user taps it (never automatically); denied or unavailable falls back
  to the village center.
- One entry (pin) per participant: `label` (e.g. "Addams Family", shown as the
  pin's name) and `note` (textarea).
- Pins must lie inside the Meckenhausen boundary (section 4).

## 2. Roles and policy
- `participant`: owns their own pin, can edit or delete it, and can invite
  others as participant or visitor.
- `visitor`: read-only map. Arrives by invite (magic link), shared peer to peer
  by participants. There is NO public access: the map shows home locations.
- Requests to join (added 2026-10-26): someone without an invite can ask, with
  an email, an optional note (0-280 chars, same text rules as a pin note) and
  consent. Any participant can allow (sends a normal invite from them, with
  the role they pick) or deny (deletes the request, nothing is sent). The
  reply never reveals whether the email is already on the map. Participants
  are emailed only when the waiting list goes from empty to non-empty, and
  the email carries nothing the requester typed.
- Never apply migrations to any non-local database.
- Only a participant can remove themselves. There is no in-app path for anyone
  else (inviter, admin) to delete a participant or their pin. "Remove me" deletes
  their pin, participant record, sessions, and their unaccepted invites.
- Invites: expire (configurable, default 7 days, never later than `EVENT_END_AT`), single-use tokens stored
  hashed, revocable while unaccepted, rate-limited per inviter, capped total per
  participant (configurable), no role escalation. Once revoked or expired, the
  inviter can delete an invite (e.g. a mistyped address): the address is
  erased and it leaves their list, but it still counts toward the limits. Reuse the existing magic-link
  mechanism. Responses must not reveal whether an email is already registered.

## 3. Privacy and GDPR (must-have; I am not a lawyer, keep copy easy to review)
- Consent: unticked checkbox at sign-up with plain-language purpose. Store
  `consentAt` and `noticeVersion`. Consent can be withdrawn by "Remove me".
- Privacy notice page (follow the app's existing language/i18n convention, add
  de and en if the app supports both). Include: controller (read name/contact
  from env vars, leave placeholders), purpose, data collected (email, label,
  note, precise pin location, IP in server logs, consent record), who sees it
  (only invited participants and visitors of this map), no third-party
  recipients other than the hosting provider, retention (deleted at
  2026-11-01T00:00:00+01:00, i.e. midnight after Halloween), rights (access,
  rectification, erasure, withdrawal, complaint to the Bavarian data protection
  supervisory authority BayLDA).
- Data minimization hints in the form: place the pin at your front door, no
  children's names, phone numbers, or full addresses in the note. Limits:
  label 60 chars, note 500 chars.
- NO third-party requests at runtime: self-hosted tiles, fonts, sprites, scripts;
  no CDNs, analytics, external fonts, or external geocoders. Add a strict
  Content-Security-Policy (default-src 'self'; connect-src 'self'; img-src 'self'
  data: blob:; worker-src 'self' blob:) and tune only as MapLibre requires;
  document any relaxations.
- Logging: never log request bodies or coordinates. Check the existing server and
  nginx config for access-log retention and document it (aim for 7 days or less).
- Deletion fairness messaging (never blocks, delays, or penalizes deletion):
  show on the sign-up form and in the delete confirmation, something like:
  "Neighbors plan their evening around this map. Please keep your pin up through
  Halloween and avoid removing it at the last minute. If you do need to, you
  always can, and it is removed immediately."
- End of event: `EVENT_END_AT` env var (default 2026-11-01T00:00:00+01:00). After
  it, the API returns 410 and serves no location data, and the client clears its
  caches. Add `pnpm purge:space` (deletes all locations, participants, invites,
  sessions, tokens, and consent records for a space, prints counts) and an
  operator-only `pnpm erase:participant -- --email <addr>` for GDPR requests
  (CLI only, never exposed over HTTP).
- Answered requests to join (added 2026-10-28): every participant gets the
  same notice, so after one of them allows or denies a request the others see
  for 24 hours that it was answered, by "you" or "another neighbor", and for
  an allowed one whether the invite has been used. Stored as
  `SpaceAccessAnswer`, with no email or note of the person who asked.
- Thank-you email (added 2026-10-27): on 31 October, before `EVENT_END_AT`,
  everyone on the map (participants and visitors) gets one thank-you email in
  their language, signed by Philip, with Reply-To his address. Sent by the
  operator with `pnpm thank:space` (CLI only); the privacy notice says so.
- Write `docs/TEARDOWN.md`: a runbook for destroying the Hetzner server using the
  repo's existing infra instructions (find them; DO NOT run anything). Checklist:
  confirm nothing else lives on that server; run purge first; delete DB dumps,
  backups, snapshots, volumes, DNS records, email-provider logs, local dev
  databases and CI artifacts; then destroy the server.

## 4. Map stack (MapLibre GL JS, self-hosted)
- Pin exact versions of `maplibre-gl` and `pmtiles`; register the pmtiles protocol.
- Boundary: look up Meckenhausen's boundary in OpenStreetMap once (a manual
  script using Nominatim/Overpass is fine at dev time), then COMMIT the resulting
  GeoJSON polygon and bbox as static config. The runtime must never call OSM.
  If no polygon exists for the Ortsteil, use a bbox and log it. Set `maxBounds`
  on the map, and validate pins against the boundary on client AND server
  (point-in-polygon, hand-rolled, no new dependency).
- Tiles: `scripts/build-tiles.sh` runs `pmtiles extract` (go-pmtiles CLI) against
  the latest daily build at build.protomaps.com for the bbox plus a small buffer,
  producing one static `.pmtiles` file with a versioned filename. Serve it as a
  static file with HTTP Range support and long immutable caching (check the
  existing web server config). If the CLI or network is unavailable, log it as a
  blocker and continue against a placeholder style (boundary outline on a plain
  background) so everything else can be built. I will supply the file later.
- Glyphs (font PBFs) and sprites must be bundled locally. Do not reference
  cdn.protomaps.com or any other CDN. Check font licenses and note them.
- Keep the basemap simple (roads, buildings, water, landuse, labels). Show a
  visible attribution: "© OpenStreetMap contributors" (required even when
  self-hosted) plus Protomaps if the data source requires it.
- SVG: the fixed center marker and participant pins are SVG. Build them with DOM
  APIs (`createElementNS`, `textContent`), never string-concatenated markup.

## 5. Pin placement input (all three must work equally)
- Mouse: drag the map under the center marker.
- Touch: pan and pinch under the marker without fighting page scroll (set
  `touch-action` correctly), test on a mobile viewport.
- Keyboard: map is focusable; arrow keys pan, +/- zoom; add explicit nudge
  buttons (N/E/S/W, small step) and a "Confirm location" button reachable by Tab;
  Escape cancels. Announce the current position and inside/outside-village status
  in an `aria-live` region. Pin markers are focusable with the label as the
  accessible name. Respect `prefers-reduced-motion` (no animated flyTo).

## 6. Browser caching and PWA
The manifest only enables installability. Caching needs a service worker: do both.
- Prefer `vite-plugin-pwa` (Workbox) if it fits the build, otherwise hand-roll.
- Precache the app shell, style JSON, sprites, glyphs, and the `.pmtiles` file.
  After the first visit the map must render with zero tile requests to the network.
  If the archive is large (over about 50 MB), use range-request caching instead of
  precaching the whole file, and make sure Range requests are answered from cache.
- Location data does not change: cache it in IndexedDB keyed by space and data
  version. Serve from cache first, then revalidate with a conditional request
  (ETag/If-None-Match, cheap `304`) at most once per session or per N hours
  (configurable, default 24 h), plus on the user's own create/edit/delete and on
  an explicit refresh button. API responses use `Cache-Control: private,
  max-age=0, must-revalidate` with an ETag.
- Personal data hygiene: clear IndexedDB and caches on sign-out, on 401, on "Remove
  me", and on 410 (event ended). Magic-link callback routes are network-only and
  never cached by the service worker.
- Manifest: name, short_name, start_url (the map home), scope, display
  `standalone`, theme and background colors, icons 192 and 512 PNG plus a
  maskable icon (create an SVG source; generate PNGs with an existing dependency
  if possible, otherwise log it). Offline: read-only map works after first
  authenticated visit; writes show a clear "you're offline" message. Handle service
  worker updates sensibly.

## 7. Dev HTTPS
- Add `pnpm dev:https` (keep the existing `pnpm dev`). Use `vite-plugin-mkcert`,
  falling back to `@vitejs/plugin-basic-ssl`. Note that `http://localhost` is
  already a secure context, so HTTPS matters mainly for testing from a phone on
  the LAN. Proxy the API through the Vite dev server (same origin) so cookies and
  CORS behave. Git-ignore certs and never commit keys. Document setup, including
  trusting the cert on a phone, in `docs/DEV-HTTPS.md`.

## 8. Security
- XSS: render `label` and `note` only as text (framework escaping or `textContent`).
  Never use `innerHTML`, `dangerouslySetInnerHTML`, or MapLibre `setHTML`; use
  `setText` or DOM nodes for popups. Add tests that `<script>`/`<img onerror>`
  payloads render as inert text.
- Server validation on every write (use the repo's existing validation library):
  lat/lng finite, in range, inside the boundary, max 5 decimals; label 1-60 and
  note 0-500 chars after trim and Unicode NFC normalization; reject control
  characters (keep umlauts and emoji); valid email for invites; role is an enum;
  request body size limits; rate limits on auth and invite endpoints.
- Authorization: participants edit or delete only their own pin, visitors get 403
  on every write. Add unit tests for invite and ownership logic.

## 9. Frontend scope
React + Vite with Pico CSS and native controls, mobile first. Build: map home with
tiles and existing pins, map/list toggle,
pin-placement flow (section 5), label and note form with counters and consent
checkbox, edit and "Remove me" flows (with the fairness copy), and an invite flow
(participants only: email and role). Visitors see the map with read-only popups.
