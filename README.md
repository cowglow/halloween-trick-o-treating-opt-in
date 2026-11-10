[![Publish Site](https://cowglow.github.io/halloween-trick-o-treating-opt-in/deploy-badge.svg)](https://github.com/cowglow/halloween-trick-o-treating-opt-in/actions/workflows/deploy.yml)
[![Tests](https://cowglow.github.io/halloween-trick-o-treating-opt-in/test-report/tests-badge.svg)](https://github.com/cowglow/halloween-trick-o-treating-opt-in/actions/workflows/test.yml)

# No pin, no ring

**An open-source, invite-only Halloween map that protects the neighbors who
aren't into Halloween.** Houses handing out sweets put a pin at their front
door, and families ring only there. Everyone else gets a quiet evening,
without having to say no.

**Project site, with a demo you can try:**
https://cowglow.github.io/halloween-trick-o-treating-opt-in/

Made for Meckenhausen, a village in Bavaria, where 12 houses were on the map
for Halloween 2026. Built so any village, town or neighborhood can run it.

## How it works

- **Opt in, not out.** Only houses that want visitors mark themselves. The
  rule for everyone else: no pin, no ring (or a lit jack-o'-lantern by the
  door, for houses that didn't make it onto the map).
- **Invite-only.** Neighbors invite neighbors; anyone else can ask to join,
  and any participant can let them in. Participants place one pin at their
  front door, with a name and a note. Visitors (families) see the map.
- **No addresses, no third parties.** A house is a pin, never an address.
  The map tiles, fonts and code come from the map's own server: no
  analytics, no ads, no tracking.
- **Gone at midnight.** Everyone gets a thank-you email on Halloween; then a
  scheduled job deletes everything. There are no backups.
- **Getting the word out.** Ready-made WhatsApp status images in English,
  German and Spanish, for families, for houses with sweets, and for
  neighbors who'd rather have a quiet night.

## Run it for your community

Everything community-specific is in one file, `community/community.json`
(name, boundary, time zone, event end, …; see `community/README.md`).
`docs/SELF_HOSTING.md` walks you from a fork to a live map: the API runs with
Docker Compose on any small server, the app on GitHub Pages, email through
Resend, and the end of the event is automatic.

## Develop

Needs Node 22+, pnpm and Docker.

```bash
pnpm install
(cd backend && pnpm install && pnpm prisma:generate)
pnpm backend:up                                                  # Postgres + API in Docker, migrated
SEED_SPACE_PARTICIPANT_EMAIL=you@example.com pnpm backend:seed   # the space and its first participant
pnpm dev                                                         # https://localhost:3000/
pnpm dev:site                                                    # the project site instead
```

Without `RESEND_API_KEY`/`EMAIL_FROM`, sign-in links are logged to the API's
console (`pnpm backend:logs`) instead of emailed. `pnpm test` runs the unit
tests, `pnpm test:e2e` the end-to-end suite against the running stack, and
`pnpm test:e2e:site` the project site's.

## Repo layout

- `community/`: the community config, and how to make your own map tiles.
- `frontend/`: React + TypeScript + Vite. The map app, and the project site
  (`VITE_SITE=true`). MapLibre with a self-hosted `.pmtiles` file in
  `public/tiles/`; works offline.
- `backend/`: Node, Express, Prisma and Postgres. All routes are under
  `/spaces/:slug`.
- `e2e/`: Playwright, against the real app, API and database.
- `scripts/`: map tiles, the WhatsApp images (`pnpm images:whatsapp`), the
  dev certificate.
- `deploy/`: the server's settings template and the end-of-event cron jobs.
- `docs/`: `SELF_HOSTING.md`, `SPEC.md` (the product spec),
  `CLEAR_ARCHITECTURE_TS.md` (the architecture), `WORKLOG.md` (how it was
  built, step by step), and the guides from running it in 2026.

## Contributing

Ideas, issues and pull requests are welcome; see `CONTRIBUTING.md`. What's
planned is in `TASK.md`, starting with printing the map.

## License

MIT, see `LICENSE`.
