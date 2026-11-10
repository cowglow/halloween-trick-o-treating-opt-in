# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An invite-only Halloween trick-or-treat map for one community, made for
Meckenhausen (Hilpoltstein, Bavaria) in 2026 and being turned into a kit any
community can run: participants place one pin at their front door with a label
and note, invited visitors see a read-only map, and all data is gone after the
event (`EVENT_END_AT`). Everything community-specific (name, slug, organizer,
time zone, event end, default email language, map center, boundary, tiles
file) is in `community/community.json` (see `community/README.md`), read by
the frontend at build time and the backend at startup; texts say
`{community}`/`{organizer}` and are filled from it. The product spec is `docs/SPEC.md`, the current open
items and decisions needed are in `TASK.md`, and history is in
`docs/WORKLOG.md`.

The architectural style is Joschi Kuphal's [Clear Architecture](https://github.com/jkphl/clear-architecture/blob/master/README.md),
as adapted for both `frontend/` and `backend/` in `docs/CLEAR_ARCHITECTURE_TS.md`
(that companion doc is the accurate reference, not the upstream conventions).

Two independently deployable pieces:

- **`frontend/`**: React + TypeScript + Vite static site (`index.html` →
  `frontend/spaces-main.tsx`), served at `base` (`/`, on its own domain `halloween.cowglow.io` via
  `public/CNAME`, in `vite.config.ts`, mirrored by `CLIENT_APP_PATH` in the backend's
  composition root and the manifest). Talks to the backend only through its REST
  API at the build-time `VITE_API_URL`.
- **`backend/`**: Node/Express + Prisma + Postgres, a separate package (own
  `package.json`/`pnpm-lock.yaml`). Live on a Hetzner server at
  `halloween-api.cowglow.io` (the `API_DOMAIN` repository variable); deploys
  run from `.github/workflows/deploy.yml` **automatically after the Tests
  workflow passes on `main`, so pushing to `main` is deploying** (see
  `TASK.md`, `docs/HETZNER_DEPLOY.md`). Don't push to `main`, deploy, touch
  Hetzner, or apply migrations to a non-local database unless Philip asks for
  it explicitly.

## Commands

Frontend (repo root):

```bash
pnpm dev                              # vite over HTTPS on :3000 (mkcert, see docs/DEV-HTTPS.md)
pnpm dev:up                           # backend up (rebuilt from current code, migrated) + dev server
pnpm dev:lan                          # dev server with the API proxied at /api, for phones (docs/DEV-HTTPS.md)
pnpm build                            # tsc && vite build
pnpm lint                             # eslint frontend e2e --max-warnings 0
pnpm test                             # vitest --coverage
pnpm test -- path/to/file.test.ts     # run a single unit test file
pnpm test:e2e                         # Playwright, e2e/spaces (needs the backend running)
pnpm test:e2e:spaces:offline          # offline test against a production build
pnpm format                           # prettier . --write
```

Backend (`backend/`):

```bash
cd backend
pnpm dev              # tsx watch src/index.ts
pnpm build            # tsc
pnpm test             # vitest run
pnpm test -- path/to/file.test.ts
pnpm prisma:generate  # after every install: Prisma 7 no longer generates on install
pnpm prisma:migrate   # create a new dev migration
pnpm prisma:deploy    # apply existing migrations
pnpm seed:space       # SEED_SPACE_PARTICIPANT_EMAIL=you@example.com - space + first participant
pnpm purge:space -- --slug meckenhausen --yes
pnpm erase:participant -- --email person@example.com
pnpm thank:space -- --slug meckenhausen   # thank-you email, dry run; --reply-to you@example.com --yes sends
```

Backend via Docker, from repo root (compose project `halloween-map`; needs host
ports 5432/4000/8081 free):

```bash
pnpm backend:up        # rebuild the API image from current code, start db/api/adminer, apply migrations
pnpm backend:migrate   # apply migrations inside the api container
pnpm backend:seed      # SEED_SPACE_PARTICIPANT_EMAIL=... pnpm backend:seed
pnpm backend:logs
pnpm backend:down
```

Unit tests only cover `*.test.ts` files (not `.tsx`) on both sides — see
`vitest.config.ts` / `backend/vitest.config.ts`. E2E tests (`e2e/spaces/*.spec.ts`)
run against a real frontend + real backend + real Postgres, single-worker; see
`e2e/spaces/README.md`.

## Architecture (frontend)

- **`domain/community/community-config.ts`**: the bundled community config,
  its center, boundary ring, max bounds and `isInsideCommunity`.
- **`domain/space/`**: types, the point-in-polygon check, `fit-view.ts`,
  `event-end.ts`, the privacy `notice-version.ts`. No framework imports.
- **`infrastructure/`**: `api/space-api-client.ts` (`spaceApiFetch`, per-space
  session in `localStorage`, ETag revalidation), `space-cache/` (IndexedDB
  location cache, cached space info), `service-worker/` (registers
  `public/sw.js`), `space-assets/` (base-path-safe asset URLs),
  `tile-server/space-map-style.ts` (the MapLibre style over the self-hosted
  `.pmtiles`, glyphs and sprite).
- **`ports/`**: `pages/space/` (invite landing, welcome, sign-in, the map
  home with its menu sheet, the two "add my house" steps, dialogs, privacy
  notice, "Let your neighbors know" with the WhatsApp images from
  `public/whatsapp/`, language picker), `context/i18n/` + `i18n/translations/` (en, de,
  es; new text needs all three). The language starts as the browser's
  (`i18n/detect-language.ts`) until someone picks one; the UI never shows the
  API's English `error` texts (`pages/space/api-error-message.ts`).

No global store: pages use React state and the API client directly. Mobile
first. Two layouts: the signed-in map is `.map-screen` (top bar, full-screen
map, bottom bar for participants; everything else is in `MenuSheet`); every
other screen renders inside `SpacePage` (one narrow column, footer with the
privacy link and language picker). Styling is Pico CSS 2 (light theme only,
`data-theme="light"`) with as little of our own CSS as possible (Philip's
rule): use Pico's plain HTML styling and its classes (`secondary`, `outline`,
`role="group"`, `aria-busy`, `<dialog><article>`) before writing CSS.
`pages/space/app.css` sets the Halloween theme through Pico's variables
(pumpkin `#c2410c` primary, purple `#5b3a8c` secondary) and holds the few
layouts Pico has no component for; `space-inline-styles.ts` holds what
MapLibre needs inline. Fonts (Fredoka headings, Nunito text) are bundled from
`@fontsource`, never loaded from a CDN. The design reference is the "Halloween
Map Mockups" canvas (https://claude.ai/artifact/YXWpKawTtePSVAroGidBrc, also
exported as PNGs in `docs/design/`). Render `label`/`note` only as text (never
`innerHTML`, `dangerouslySetInnerHTML` or MapLibre `setHTML`;
`no-unsafe-html.test.ts` checks this). No third-party requests at runtime: the
CSP in `vite.config.ts` and the e2e suite both enforce it.

Imports are absolute from `frontend/` (e.g. `ports/pages/space/MapHomePage.tsx`,
not a relative path), via `"paths": {"*": ["./frontend/*"]}` in `tsconfig.json`
and the `vite-tsconfig-paths` plugin. The frontend stays on TypeScript 6 (the
newest typescript-eslint supports; TypeScript 7 has no JS API for it); the
backend is on TypeScript 7.

Role gating (`participant` = owns a pin and can invite, `visitor` = read-only) is
shown in the UI but enforced on the backend; the frontend check is a UX
convenience, not the security boundary.

## Architecture (backend)

`backend/src/` follows the same Clear Architecture tiers.
`prisma/schema.prisma` is the source of truth for the data model (`Space`,
`SpaceParticipant`, `SpaceLocation`, `SpaceMagicLinkToken`, `SpaceInvite`,
`SpaceAccessRequest`, `SpaceAccessAnswer`),
accessed only from `infrastructure/prisma/`. Migrations start from one squashed
`init` (2026-10-03).

- **`domain/`**: `space/` (types, point-in-polygon, text sanitizing)
  and `auth/magic-link.ts` (`TOKEN_TTL_MS`, `hashToken`, `isTokenUsable`).
- **`application/`**: `space/space.repository.ts` (one interface per
  aggregate), `space/space.use-cases.ts` (sign-in, invites, accepting, pin
  writes, "Remove me", each a `create*UseCase(deps)` factory),
  `space.test-support.ts` (in-memory fakes), plus the `mailer.ts`,
  `space-token-signer.ts` and `token-generator.ts` interfaces.
- **`infrastructure/`**: `prisma/` repository implementations, `mail/`
  (`getMailer()` picks the console or Resend mailer based on whether
  `RESEND_API_KEY`/`EMAIL_FROM` are set, independent of `NODE_ENV`), `auth/`
  (`spaceJwtTokenSigner` using `SPACE_JWT_SECRET`, `randomTokenGenerator`),
  `config/community.ts` (reads and validates community.json, from
  `COMMUNITY_CONFIG` in Docker, the repo root otherwise).
- **`ports/http/`**: `routes/space.routes.ts` (`createSpaceRouter(deps)`, all
  routes under `/spaces/:slug`), zod schemas in `validation/`, middleware for
  auth, roles, rate limits, request validation and `requireEventActive` (410
  after `EVENT_END_AT`), and `lib/async-handler.ts` + `error-handler.ts` so
  handlers need no try/catch.
- **`composition-root.ts`**: the one place concrete infrastructure is built and
  wired, including the env-configurable invite limits and `EVENT_END_AT`.

Only a participant can remove themselves; there is deliberately no path for
anyone else to delete a participant or their pin. Never log request bodies or
coordinates.

## Autonomous work log
Keep a running log in `docs/WORKLOG.md`. Before each major step, append a
timestamped entry: what you're about to do and why. After each step, note the
result, files changed, tests run, and any decisions or dead ends. Commit
small and often. If blocked, log the blocker and move to the next task
rather than stopping to ask.
