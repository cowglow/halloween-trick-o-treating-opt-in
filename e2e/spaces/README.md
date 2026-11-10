# Spaces (Halloween map) end-to-end tests

One serial spec, `spaces.spec.ts`, driving every action of the map in a real
browser against the real API and Postgres: sign-in form, invite accept with
consent, pin add / edit / delete, the map/list toggle, the invite modal
(focus, Tab trap, Escape, revoke), read-only visitors, self-removal (including
the regression where a participant has an accepted invitee), tile serving, and
"no request ever leaves the app + API origins". It also fails on any CSP
violation.

`touch.spec.ts` runs on a Pixel 7 viewport with real touch input (CDP
`Input.dispatchTouchEvent`): a one-finger pan and a two-finger pinch during
pin placement must move the map, and must not scroll or zoom the page
(docs/SPEC.md section 5).

```bash
pnpm backend:up                              # db + api (dev mode -> devToken in responses)
(cd backend && SEED_SPACE_PARTICIPANT_EMAIL=participant@example.test pnpm seed:space)   # once
pnpm test:e2e:spaces                         # reuses a running `pnpm dev` on :3000, else starts one
```

The suite uses the normal `:3000` dev stack and a seeded *space participant*
(`E2E_SPACE_SEED_EMAIL`, default `participant@example.test`).

Test data: every throwaway account is `e2e-*@example.test`. The suite deletes
its own rows afterwards through the local `halloween-map-db` container
(best effort - skipped if docker isn't available), because accepted invites
count against the seeded participant's lifetime invite cap (50).
The API must be in dev mode: sign-in and invite responses carry a `devToken`
so no email is needed.

Rate limits: the API limits magic-link requests to 20 per 15 minutes per IP and
one run uses about 4, so wait a few minutes between more than two back-to-back runs.
