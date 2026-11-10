# Contributing

Thanks for wanting to help. Issues and pull requests are welcome, from bug
reports to running the map in your own community and telling us what got in
the way.

## Before you start

- Open an issue first for anything bigger than a fix, so we can agree on the
  approach.
- What's planned is in `TASK.md` (the roadmap): printing the map is first.

## How the code is organized

Both `frontend/` and `backend/` follow the Clear Architecture tiers
(`domain`, `application`, `infrastructure`, `ports`), as described in
`docs/CLEAR_ARCHITECTURE_TS.md`. `CLAUDE.md` is a compact tour of the whole
codebase and its rules.

## Rules that keep the map what it is

- **Privacy first.** No requests to third parties while the app runs (the
  e2e tests fail on any), no analytics, no logging of request bodies or
  coordinates. Personal data is deleted at the event end.
- **Text, never markup.** Labels and notes are rendered as text only (never
  `innerHTML`, `dangerouslySetInnerHTML` or MapLibre's `setHTML`).
- **Three languages.** New text needs English, German and Spanish
  (`frontend/ports/i18n/translations/`, `backend/src/infrastructure/mail/email-copy.ts`).
- **Nothing community-specific in code.** It belongs in
  `community/community.json`.
- **Pico CSS first.** Use Pico's plain HTML styling and classes before
  writing CSS.

## Checks

Run these before opening a pull request:

```bash
pnpm lint && pnpm test && (cd backend && pnpm test)
pnpm test:e2e        # with the backend running (pnpm backend:up)
pnpm test:e2e:site
```

CI runs all of them on every push to `main`.
