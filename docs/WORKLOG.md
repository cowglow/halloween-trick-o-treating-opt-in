# Work log

## 2026-11-10 - A fresh public repo

GitHub keeps every pull request's commits (`refs/pull/*`), so the old
commits stayed reachable after the rewrite until GitHub Support purges them.
Philip chose not to wait: the old repo is now the private
`halloween-trick-o-treating-opt-in-archive` (with its pull requests and
issues), and this repo starts again under the original name from one commit
with the files as they were on 2026-11-10. This log is the history.

## 2026-11-10 - External links open in a new window

Philip asked that links to other sites open in a new window with
rel="noopener nofollow". The project site's three GitHub links now go
through `ports/pages/site/ExternalLink.tsx`, which also tells screen readers
"(opens in a new window)" (en/de/es). `external-links.test.ts` fails on any
other plain `<a>` in the pages (the WhatsApp downloads, `href={src}`, are
the site's own files). Unit tests 95 passed, site e2e 3 passed.

## 2026-11-10 - MIT license, history rewrite

Philip chose MIT and a history rewrite over a fresh repo. Added LICENSE and
a License section in the README. Then rewrote every branch with
`git filter-repo --replace-text`: the neighbor's invite address became
`neighbor@example.com` and the three server IPs `203.0.113.x`
(documentation addresses), in files and messages; force-pushed. GitHub keeps
pull request refs (`refs/pull/*`) read-only, so commits reachable only
through old PRs still hold the old text until GitHub support purges them.

## 2026-11-09 - Step 5: privacy pass and public README

Scanned every tracked file and the whole git history for email addresses,
IPs, keys and tokens. No secrets were ever committed. Found and removed from
the current WORKLOG: a neighbor's real invite address (2026-09-23 entry) and
the server IPs. Philip's own addresses stay (they were public on the privacy
notice). The e2e seed email default is now participant@example.test (as in
CI); a local stack seeded with another address needs
`E2E_SPACE_SEED_EMAIL`. README rewritten for the public (the pitch, the
project site, how it works, run it, develop, layout); CONTRIBUTING.md added.
Open for Philip (TASK.md step 5): a license, the history (that address is
still in one September commit), the stale `.env.example` keys, then going
public. e2e 32 passed.

## 2026-11-09 - Step 3c: a generic way to run it

docs/SELF_HOSTING.md is the guide for running the map for another community:
fork and describe the community, start the API on any server with Docker,
publish the app on GitHub Pages on its own domain, and the automatic end.
- docker-compose.prod.yml builds the API on the server from the checkout
  (it pulled our private ghcr.io image before); deploy/env.example lists
  the server's .env.
- deploy.yml publishes the map app when the fork sets MAP_API_URL and
  MAP_DOMAIN (writing dist/CNAME; the app must be at a domain's root, as
  CLIENT_APP_PATH is ""), and the project site otherwise.
- The end of the event: deploy/teardown.sh moved out of deploy/hetzner/;
  deploy/thank-you.sh is new; both source deploy/event-time.sh, which reads
  the slug and eventEndAt from community/community.json (EVENT_END_AT in
  .env wins), and check the time in the shell before touching Docker, so
  deploy/crontab.example can run them all year (every 5 minutes / every
  minute) for any event date. Tested in a debian:stable-slim container with
  stub docker and crontab: the thank-you sends only in the last 15 minutes
  with the slug from the config, the teardown only a minute after the end
  (falls back to --without-thanks, keeps other cron lines), and both use
  community.json's end when .env has none.
- HETZNER_DEPLOY.md is marked as how the 2026 server was set up, one option
  under SELF_HOSTING.md.

## 2026-11-09 - Step 4: the project site, and generic WhatsApp images

The deployed site is now the project's documentation instead of the 2026
app. One codebase, two builds: `VITE_SITE=true` (`pnpm dev:site`,
`pnpm build:site`) renders `ports/pages/site/SiteApp` instead of the map
app, with no service worker and no API.
- Home (`SiteHomePage`): "No pin, no ring", the problem (not everyone wants
  the doorbell; opting out puts the burden on the wrong people), the idea
  (opt in, not out; the lit pumpkin), how it works with three mockup
  screenshots (public/site/), privacy by design (the change log's ideas),
  getting the word out, the 2026 pilot (12 houses, the 2019-2026 timeline
  moved from the review page), how to run it, what's next (printing the
  map first). en/de/es (`spaceSite`).
- Demo (`#/demo`): the app's own screens (tap to place, name and note, map
  and list, the rules popup) with houses kept in component state only: no
  default markers, nothing sent, gone on reload. On the self-hosted
  Meckenhausen tiles.
- Share (`#/share`): the app's image list (`ShareResourceList`, extracted
  from ShareResourcesPage) with halloween.domain.com in the captions.
- The example privacy notice at `#/meckenhausen/privacy`.
WhatsApp images: the 15 canvas sources are now templates in
scripts/whatsapp/templates/ (`{{community}}`, `{{url}}`), rendered by
`pnpm images:whatsapp -- --url …` with the app's own fonts embedded; the
images in public/whatsapp/ now say halloween.domain.com.
The app after the event shows a generic "Thank you, {community}!" closed
page (ClosedPage) instead of the review page, which is gone with
review-numbers.ts. Base path (`VITE_BASE`), page title (from community.json,
or the site's) and a relative, generic manifest are configurable;
public/CNAME is removed, so the site moves to
cowglow.github.io/halloween-trick-o-treating-opt-in/. deploy.yml builds the
site (base from the repo name); test.yml also runs the new site e2e suite
(e2e/site, playwright.site.config.ts, phone viewport: the story, the demo
adding a house with no API or third-party requests, the share page and the
privacy notice). Tests: frontend 64, site e2e 3, app e2e 32 passed; a
headless check of the built site at its subpath found no external requests
or console errors.

## 2026-11-09 - Step 3b: the privacy notice as a plain template

Philip: the privacy notice is just the legal text for the example. Its
change log is gone (page, translations, notice-changes.test.ts, the e2e
check); the version line stays, since consent records it. The hosting
provider is a config field (`hostingProvider`, "Hetzner" in the example)
filled into the "service providers" paragraph as `{hosting}`
(`fillCommunity` now takes several values). Resend stays named: it's the
only mailer the code has. community/README.md tells forkers to read the
notice and make it match how they run the map. Tests: frontend 65, backend
134, e2e 33 passed.

## 2026-11-09 - Step 3a: one community config

Everything that said Meckenhausen in code now comes from
`community/community.json` (name, slug, organizer, time zone, event end,
default email language, map center, boundary ring, tiles file), with
`community/README.md` explaining each field, the boundary's provenance and
how to cut tiles. Frontend: `domain/community/community-config.ts` imports it
(tsconfig path `community/*`); the boundary files are gone, the map's max
bounds come from the ring's bounding box; texts say `{community}`
(`fill-community.ts` fills every string and text function; German
"Meckenhausener Karte" became "Karte für {community}"); the 2026 review texts
keep the real name (they move to the project site). Backend:
`infrastructure/config/community.ts` reads and validates it with zod (path
from `COMMUNITY_CONFIG`, mounted in both compose files, or the repo root);
`isInsideBoundary(ring, …)` replaces the Meckenhausen check; `toLanguage`
takes the fallback; email copy fills `{community}` and `{organizer}` (the
thank-you was signed "Philip"); event end, seed slug/name and time zones read
it. The thank-you's "what changed is at the end" line went with the change
log. `scripts/build-tiles.sh` reads the bbox and file name from it (same
bbox as before). Kept: the app's language detection still falls back to
English; `defaultLanguage` is for emails. Checked: a throwaway Docker build
loads the mounted config and fails clearly without it; backend 134, frontend
69, e2e 33 passed.

## 2026-11-09 - Step 2: tap to place a house

Philip: let people add their house by clicking the map. PinPlacement keeps
its fixed center marker (that's what keeps keyboard, nudge buttons and the
screen-reader announcement working), and a tap or click now jumps the map
so the tapped spot is under the marker: the pin lands where you tapped.
No animation, as everywhere else in the map (reduced motion). SpaceMap got
an `onClick` prop. The placement title, instructions and the first welcome
step say "tap your front door" (en/de/es). New e2e test: a click east of
the marker raises the announced longitude and keeps the latitude. e2e 33
passed (throwaway backend), including the phone pan/pinch test, so taps
don't get in the way of dragging.

## 2026-11-09 - Step 1: the numbers, and CI after the event

- The review page says "12 houses on the map handed out sweets" (en/de/es).
  Philip's count; the server logs weren't kept. `REVIEW_NUMBERS` is now
  `{ houses }` only.
- deploy.yml: the `deploy_server` job is gone, with the API health badge
  (README) and the manual `backend-up.yml`/`backend-down.yml`. They would
  have SSHed to [the server's IP], which belongs to someone else now. The site
  job no longer waits for it.
- CI would have failed every e2e test from now on: the e2e stack used the
  real event end (past), so the API answers 410 and the app shows only the
  review page. `E2E_EVENT_END_AT` (helpers.ts, 2099-11-01) now feeds the
  frontend (Playwright webServer env, both configs) and docker-compose.yml's
  api `EVENT_END_AT` default; the review redirect test sets the clock past
  that, and the privacy-date checks expect 2099.
- TASK.md: Philip's answers (privacy notice = plain legal text for the
  example, generic address `https://halloween.domain.com`).
Tests: frontend unit 67, e2e 32 passed (throwaway PGlite + backend on :4001
with EVENT_END_AT=2099, dev server on :3001).

## 2026-11-09 - After the event: the plan to open-source it

Verified the server is gone: the API doesn't answer, and its old address
([the server's IP]) now serves someone else's nginx with a different SSH host
key. It's not in the `visual-directory` Hetzner project either (the
halloween project's own token wasn't read). Philip deleted the leftover
`halloween-api.cowglow.io` DNS record, which pointed at that stranger's
server. The site serves the review page.

Philip decided the next phase: a public repo with a turn-key, generic
community map, and a static project site (docs, an in-browser demo where
visitors tap to add houses with no default markers, the share page as an
outreach example), without the custom domain. TASK.md rewritten with the
decisions and five steps.

## 2026-10-30 - Emails in German by default, and the map reports each person's language

Philip asked whether the thank-you is English only. It isn't (en/de/es per
person), but everyone who joined before 26 October was stored as "en" (the
column's default when it arrived) and only a new sign-in link corrected it,
so the early, mostly German-speaking participants would have got it in
English. Philip: default everyone to German, and capture the preference from
now on. Done:
- `DEFAULT_LANGUAGE` is "de" (clients that send none), and both language
  columns default to 'de'.
- Migration 20261030000000_default_language_de sets participants stored as
  'en' who joined before the email_language migration finished (its
  `finished_at` in _prisma_migrations) to 'de'; later joiners chose their
  language when joining and keep it. Checked on PGlite: early en → de, early
  es kept, late en kept; `migrate diff` shows no drift.
- `PUT /:slug/me/language` (any signed-in role, event gate, zod enum):
  MapHomePage sends the language on opening the map and on every change,
  best effort. So whoever opens the map on the 31st before 23:45 gets the
  thank-you in the language their app shows.
- Privacy notice: lists the language as stored data; version 2026-10-30
  with a change-log entry in all three languages (frontend and backend).
Tests: backend 132 (route tests for the new endpoint, the German default),
frontend unit 67, e2e 32 passed (new test: the PUT on opening and on
changing language), run against this branch's backend on :4001 and a dev
server on :3001 beside Philip's running stack (spec's APP_ORIGIN is now
overridable with E2E_APP_ORIGIN).

## 2026-10-30 - The project review replaces the app after the event

Philip: keep the domain, and put a review there that explains the idea and
the effort, to find interest for next year. The server is torn down at
00:01, so the review is part of the app itself and needs no server: once
the build's event end has passed (`domain/space/event-end.ts`,
VITE_EVENT_END_AT from the EVENT_END_AT variable, now passed by deploy.yml;
an empty value falls back to the default), every route redirects to
`#/review`, except the privacy notice. No deploy is needed at midnight,
and phones holding the app offline switch over too. `#/review` also works
before the end, to check it. ReviewPage (en/de/es): thank you, the idea
("no pin, no ring", plus the pumpkin), how it worked, three images (the
map mockup copied to public/review/, and the candy and quiet WhatsApp
images in the reader's language), what it took (2019, 2023, 2024, 2025,
2026 from the git history; "more than 350 commits, over 45 PRs, more than
180 tests"), and a mailto link to the privacy contact for next year.
`review-numbers.ts` holds the evening's counts, null (hidden) until Philip
copies them from teardown.log. PrivacyNoticePage uses the same event end
(it had `??`, so an empty variable would have shown an invalid date).
Also: the rules popup said "Pin" in German and Spanish; the app says
"Stecknadel" and "marcador", fixed. Tests: event-end unit tests; e2e for
#/review (headings, images load) and for the redirect after the end (Playwright's
clock set to 00:00:30 on 1 November). Full build, lint, unit tests pass;
e2e 25 passed, 1 failed on leftover "answered" rows in Philip's local DB
from an interrupted run (expects 2, sees 4), unrelated.

## 2026-10-30 - The teardown runs by itself at 00:01

Philip: automate the teardown too; he deletes the server by hand.
`deploy/hetzner/teardown.sh`, copied to the server by deploy.yml and run from
the deploy user's crontab every minute on 31 October and 1 November
(`# halloween-teardown`, under flock). It exits unless it's at least a minute
past EVENT_END_AT (read from .env, the backend's default when empty; GNU
`date -d`, so the server's time zone doesn't matter), then: `purge:space
--yes`; if that refuses (someone unthanked: after the event the email can't
go out any more, and deleting at midnight is the promise that matters) it
retries with `--without-thanks`; `docker compose down --volumes`; deletes
.env; removes both `# halloween-` crontab lines. Output (counts only) to
/opt/halloween-map/teardown.log, so the numbers survive for a project
review. Tested in a debian:stable-slim container with stub `docker` and
`crontab`: before the time it does nothing; after it purges, downs, deletes
.env and keeps unrelated crontab lines; a refused purge falls back to
--without-thanks; an empty EVENT_END_AT uses the default. TEARDOWN.md
updated (and: don't push to main after midnight, it would bring the
containers back).

## 2026-10-30 - The thank-you email goes out by itself (cron)

Philip: schedule the thank-you email on the server instead of running it by
hand. `thank-space.ts` gets `--within-hours N`: it quietly does nothing
unless EVENT_END_AT is less than N hours away and not past (changed the same
evening to `--within-minutes 15`, every 5 minutes: Philip wants it at 23:45,
with 23:50 and 23:55 as the retries), so the time
window is checked against the absolute event end, not the server's clock
zone. The deploy (deploy.yml) now writes `THANK_YOU_REPLY_TO` (the
PRIVACY_CONTROLLER_CONTACT variable) into the server's .env, passes it to
the api container, and installs one crontab line for the deploy user
(`# halloween-thank-you`, replaced on every deploy, under `flock`): every
15 minutes on 31 October, `thank:space --yes --within-hours 3`. So it sends
at 21:00 Meckenhausen time and the later runs pick up late joiners and
retries. Output (a timestamp plus counts, no addresses) goes to
/opt/halloween-map/thank-you.log. TEARDOWN.md says how to check it and how
to remove the line. Checked locally, dry run only: outside the window it
prints nothing (exit 0), inside it reports the counts, after the end
nothing, bad input exit 1. Backend tests pass; YAML parses.

## 2026-10-30 - Trick-or-treat rules pop up on the first visit to the map

Philip, the day before Halloween: remind families not to ring where there's
no pin, and since not every house will be on the map in time, add the rule
of thumb that a house without a jack-o'-lantern probably isn't taking part.
New `RulesDialog` ("Before you head out", en/de/es), five short rules:
pin or pumpkin: ring; no pin, no pumpkin: walk on; ring once; be kind;
stay safe. It opens over the map the first time it loads in a browser (a
`space-rules-seen:<slug>` flag in localStorage, `rules-seen.ts`; blocked
storage just shows it again) and never over the welcome screen or pin
placement. "Trick-or-treat rules" in the menu reopens it. Shown to everyone,
any day, not only on 31 October: the frontend doesn't know the event date,
and a family planning the evening ahead benefits too. No autofocus on the
button: on a phone it scrolled past the first rule. e2e: a new test for the
popup; the other tests mark it seen (`skipRules` in helpers.ts). Full e2e
suite (29) passed against Philip's running local stack, plus lint, tsc and
unit tests.

## 2026-10-28 - "They can" as cards, like the WhatsApp image

Philip: the app's role choice didn't look like "Who are you inviting?".
New `RoleChoice` component, used by Invite neighbors and Requests to join:
one bordered card per option with an icon (house, eye), the label in bold,
the explanation under it; the chosen card in the pumpkin color with a light
tint (`:has(input:checked)`, so no extra state). Same order, ids and
aria-describedby as before. Checked at phone width against Philip's
running local stack (read only); lint, tsc and unit tests pass. The full
e2e suite wasn't rerun locally (Philip's stack holds the ports and its
own pins break the map tests); the Tests run on main covers it before
deploying.

## 2026-10-28 - `dev:up` rebuilds the API and migrates

Philip asked whether the local dev stack follows his edits. The frontend
does (Vite), the Docker API didn't: `docker compose up -d` reused an image
built on 2026-10-15, so local dev had none of the backend work since then,
and migrations only ran by hand. `backend:up` (and so `dev:up`) now runs
`docker compose up -d --build` (cached layers keep it quick when nothing
changed) and then `pnpm backend:migrate`. The API still doesn't reload
while running: rerun `pnpm dev:up`, or use `cd backend && pnpm dev`.
`dev:down` now calls `backend:down` (same command, one place).

## 2026-10-28 - WhatsApp images in the app, and the role choice

Philip found the person from today's request had been let in as a visitor.
Decided: no "make them a host" feature; they use "Remove me from the map"
and get invited again with "Add their house and invite others" (re-inviting
an address already on the map does nothing, on purpose). To make the choice
clearer and to let members recruit too:
- New story "Who are you inviting?" (de/en/es) on the "Halloween Map: Ask to
  Join" canvas, third row; Spanish versions of "how to get on the map" and
  "handing out sweets". All nine rendered with Playwright and the bundled
  fonts into `public/whatsapp/` and `docs/design/` (the existing de/en files
  came out byte-identical).
- "Where's the candy?" (the first story, from the Mockups canvas) copied to
  the Ask to Join canvas in de/en/es, first on the page. Its ending changed
  from "reply with your email and I'll invite you" to "open
  halloween.cowglow.io and tap Ask to join": visitors can't invite, so the
  original only works for Philip. The map strip was being squeezed by the
  flex column (the "Yours too?" label cut off, also in the original):
  `flex-shrink: 0` and the padding of the other stories.
- Philip's canvas comments: "Handing out sweets?" now matches "Where's the
  candy?" (map strip, steps, address box) in all three languages; the
  sign-in and "Ask to join" labels no longer break across lines. And the
  role choice in the app was less clear than the story, so Invite neighbors
  and Requests to join now show a line under each option ("For homes
  handing out sweets...", "For families going trick-or-treating...") linked
  with aria-describedby, plus "This can't be changed after they join."
- "Not into Halloween?" ("No pin, no ring"), for the neighbors who see these
  statuses and don't want kids ringing all evening (trick-or-treating is new
  in the village and not everyone likes it). Says they needn't do anything,
  that families are asked to ring only where there's a pin, and, honestly,
  that leaving the porch light off is the way to be sure of a quiet
  evening; the map can't promise it. Third on the page and canvas.
- "Let your neighbors know" page (`/#/<slug>/share`), linked in the menu
  right after "Invite neighbors", for visitors too. Shows only the reader's
  language: each image with Download, Share (where the browser can share
  files, i.e. phones: straight to WhatsApp), and its caption with the
  request-access link and a copy button. `share-resources.test.ts` fails if
  an image is missing in any language. No new third-party requests.
- The role choice in Invite neighbors and in Requests to join now lists
  "Add their house and invite others" first (Philip's request). The default
  is still "Only look at the map".
Tests: frontend 57, lint, build, e2e 28 locally (new: menu to the page,
English images load, switching to German switches the files) and the
offline test.

## 2026-10-28 - "Someone asked to join", but no request on the map

Philip got the notice email, opened the map, and found no pending request.
Checked through the Resend plugin, not the server: the notice went to all four
participants at 12:47 (Meckenhausen time) and an invite to a new address at
13:06, so another participant allowed it 19 minutes later. Sign-up worked;
what was missing is any trace of the answer for the others who got the
same email, and any way to see whether the invite was then used.

Built:
- `SpaceAccessAnswer` (migration `20261028000000_access_answers`): allow or
  deny records outcome, who answered and, if allowed, the invite it created.
  No email or note of the person who asked; both links are SET NULL on
  delete, so "Remove me" and invite deletion work as before; purge deletes
  them. Written by hand (`prisma migrate dev` needs a shadow database PGlite
  can't give); `prisma migrate diff` against the schema came back empty.
- `GET /access-requests` adds `answered` (last 24 hours, newest first):
  outcome, time, `byYou`, invite status (joined, pending, expired, revoked,
  or null). `createListAccessRequestsUseCase`. The invite's id stays inside
  the backend: `inviteParticipant` still returns only the generic message,
  since exposing it would tell the inviter whether an email is already on
  the map.
- The map shows "N requests answered" when nobody is waiting but something
  was answered in the last day; the dialog lists them ("Let in by another
  neighbor, invite sent, not joined yet").
- The notice email says someone may have answered first.
- Privacy notice: the request paragraph says what participants see after an
  answer; version 2026-10-28 with a change log entry (en/de/es).
- `docs/CHECK_SIGNUPS.md`: Philip's runbook for checking on the server
  (read-only psql session; the four queries were run against a local
  database with e2e data).
Tests: backend 130 (two new use-case tests, a route assertion), frontend 52,
lint, build, all 27 e2e locally (the request test now checks the answered
list before and after the invite is used).
Found on the way, not changed: `erase:participant` deletes only the
participant's unaccepted invites before the participant row, so it would
fail on someone whose invitee has joined (the "Remove me" cascade handles
this), and it leaves invites addressed to their email.

## 2026-10-27 - WhatsApp stories for recruiting homes

One home has signed up; Philip wants more. Added a second row to the "Halloween
Map: Ask to Join" canvas: "Du verteilst Süßes?" / "Handing out sweets?", same
look as the ask-to-join stories, steps in the app's exact labels (ask to join,
write "We're handing out sweets" under "Who are you?" so whoever answers knows
to let them in as a house, then Join the map, Add my house), and reassurance
(no address, "Remove my house" any time, deleted on 1 November). Captions with
the tappable request-access link are notes beside them. Rendered to
`docs/design/whatsapp-story-homes-{de,en}.png` with Playwright and the bundled
fonts. Note for answering requests: the role picker defaults to visitor, so a
home has to be allowed with "Add their house and invite others".

## 2026-10-27 - Notice: Resend's region and no tracking

Checked through the Resend plugin: `mail.cowglow.io` sends from eu-west-1
(Ireland), with open and click tracking off and receiving off. The notice's
"Who else receives it" now says so (en/de/es), and the 2026-10-27 change
log entry mentions it. No version bump: it states how things already work,
it doesn't change any use of the data. Philip asked to deploy it.

## 2026-10-27 - Change log on the privacy notice; the thank-you links it

Someone has joined under notice 2026-10-26, so the bump to 2026-10-27 stands
and they deserve to see what changed. Philip asked for both:
- A "Changes to this notice" list at the end of the privacy page (en/de/es),
  newest first: 2026-10-27 (thank-you email, Resend named, no backups),
  2026-10-26 (asking to join), 2026-09-21 (first version). A unit test
  (`notice-changes.test.ts`) fails if the newest entry isn't
  `CURRENT_NOTICE_VERSION` or the languages disagree; `notice-version.ts`
  says to add an entry with every bump.
- The thank-you email gets a paragraph saying the notice now mentions the
  email and who sends it, with a link to the privacy page
  (`CLIENT_ORIGIN/#/<slug>/privacy`; the script prints it in the dry run).
  `Mailer.sendThankYou` and the use case take the link.
Philip asked to merge and deploy this (PR #37), and to see how the pilot goes.

Result: Tests on `main` failed (run 40570319379), so nothing deployed. The
e2e privacy check used `getByText("2026-10-27")`, which now matches the
change log too (strict mode, 2 elements). I hadn't rerun e2e after adding
the change log; PRs get no CI here, so run e2e locally before merging.
Fix: assert "Notice version: 2026-10-27" and the change log heading; all
27 e2e tests pass locally.

## 2026-10-27 - Privacy notice names Resend; purge waits for the thank-you

Philip: be transparent about how it works, make clear the email is stored on
the server and not backed up, and make sure the thank-you goes out before
the server goes down. "Who else receives it" said only the hosting provider
did, but Resend has received every address since the first sign-in email.
Now it names Hetzner (server and database) and Resend (every email this map
sends, the address and the text, kept under Resend's own retention rules,
which we don't state since they aren't ours). "How long it's kept" now says
the data lives only in this map's database on that server, with no backups
or copies, so nothing outlives the deletion. en/de/es; same notice version
(2026-10-27), since that version hasn't shipped yet. `purge:space --yes`
now refuses while anyone has `thankedAt` null (`--without-thanks`
overrides, for an address that keeps failing) and its dry run shows the
count. TEARDOWN.md and HETZNER_DEPLOY.md say so.

## 2026-10-27 - Thank-you email (TASK.md item 3)

Philip's decisions: it goes to everyone on the map (participants and
visitors), the privacy notice gets a line saying so (version bumped to
2026-10-27 on both sides), it thanks them, says everything is deleted at
`EVENT_END_AT`, invites replies with ideas for next year (Reply-To is his
address), and it's signed "Philip". Plan: `buildThankYouEmail` in
`email-copy.ts` (en/de/es), `Mailer.sendThankYou`, a nullable
`SpaceParticipant.thankedAt` so a rerun after a partial failure skips
the people already thanked, and an operator script `pnpm thank:space`
(dry run by default, `--yes` to send, paced for Resend's rate limit,
logs only counts). It must run on 31 October, before the deletion.

Result: done as planned. The loop is a use case
(`createThankEveryoneUseCase`) rather than script code, so the fakes test it:
dry run counts per language and sends nothing; everyone in the space gets
it in their language with the deletion time and Reply-To; a rerun sends
nothing twice; one failed send doesn't stop the rest and a rerun retries
only that one; nothing goes out after `EVENT_END_AT` (`EventEndedError`).
Failures are counted, not logged, so no address reaches the output (the
console mailer used in dev still prints them, like its other emails).
The script uses the app's shared Prisma client, since the repository does;
a second client would leave a pool open. Checked against a local PGlite
database with the console mailer: dry run, missing `--reply-to` refused,
send, rerun (0 sent), after the event refused; the process exits by itself.
Migration `20261027000000_participant_thanked_at` (nullable column).
Notice version 2026-10-27; the e2e notice check follows. Runbook in
`docs/TEARDOWN.md` ("Before") and `docs/HETZNER_DEPLOY.md` (Operations).
Backend 128 tests, frontend 48, lint, tsc and build pass.

## 2026-10-26 - GitHub Actions to their latest majors

The last part of "update everything": actions/checkout v4 -> v7,
pnpm/action-setup v4 -> v6 (still reads pnpm 9.15.1 from packageManager),
docker/setup-buildx-action v3 -> v4, docker/login-action v3 -> v4,
docker/build-push-action v6 -> v7, appleboy/scp-action 0.1.7 -> 1.0.0 (now
a composite action, same inputs). ssh-action v1, github-pages-deploy-action
v4 and claude-code-action v1 were already current. Separate from the app
update (#33/#34) so a broken pipeline can be reverted on its own; the
Tests run and the deploy after merging are the only real check.

## 2026-10-26 - CI fix after the dependency update

#33's Tests run on `main` failed, so nothing deployed. E2E passed (27, against
the Docker image with Prisma 7), but the backend route tests couldn't load
`@prisma/client`: Prisma 7 no longer generates the client on `pnpm install`,
and only the Docker build ran `prisma generate`. My local checkout had a
generated client, which hid it. Fix: a "Generate the Prisma client" step in
`test.yml` after the backend install (not a postinstall hook: the Docker
build installs before the schema is copied in), and the command in
CLAUDE.md. Checked by deleting the generated client locally: the route
tests fail the same way, then pass after `pnpm prisma:generate`.

## 2026-10-26 - Updating every dependency, majors included

Philip: "the goal is to update everything and deploy the new changes", so
the event-week hold on majors (TASK.md item 4) is lifted. Branch
`chore/update-all-dependencies`, one commit per group, each checked with
lint, tsc, build and unit tests on both sides:
1. Non-major updates (React 19.3, maplibre-gl 6.16, Playwright, prettier,
   resend, zod, ...). Backend `@types/node` stays on 22.x because the server
   runs Node 22.
2. Tooling majors: Vite 8, plugin-react 6, vite-tsconfig-paths 6, Vitest 5,
   ESLint 10 (+ `@eslint/js` declared), react-hooks 7 (flat config moved; its
   new set-state-in-effect rule flags two data-loading effects that only set
   state after an await: annotated, not rewritten), `import.meta.dirname` in
   vite.config.ts. Vitest 5 clears mock calls between tests, which broke a
   route test of mine that read calls from an earlier test: made it
   self-contained.
3. TypeScript 7 for the backend. The frontend stays on 6.0.3: TS 7 ships no
   JS API and typescript-eslint (and vite-plugin-checker) need it; lint
   crashes on 7. The frontend tsconfig is migrated anyway (paths instead of
   baseUrl, Bundler resolution, `types: ["node"]`).
4. Express 5 (a `param()` helper for the new string | string[] param type)
   and dotenv 18 (loaded through `src/load-env.ts` with `quiet: true`).
5. Prisma 7.10.1 (not the `latest` tag, which is 8.0.0-rc): the URL moves
   to `backend/prisma.config.ts` (copied into the Docker image), the client
   connects through `@prisma/adapter-pg`, and the operator scripts use the
   shared `createPrismaClient()`. Local e2e first failed: the pg pool opens
   several connections and PGlite's socket server allowed one;
   `scripts/dev-db.ts` now sets `maxConnections: 20` (dev only).

Result with everything updated: frontend 48 + backend 120 unit tests, lint,
tsc and build clean, e2e 27 passed and the offline e2e passed (fresh PGlite
database, all migrations), `purge:space` (dry run) and `erase:participant`
work on Prisma 7. Not testable here: the Docker image build (no Docker); the
Tests workflow builds it and runs e2e against it before any deploy.
The GitHub Actions majors follow in a separate PR, so a broken deploy
pipeline can be reverted on its own.

## 2026-10-26 - "Ask to join" WhatsApp stories

Philip will share the map again in his WhatsApp status, now that people can
ask to join. Made a design canvas, "Halloween Map: Ask to Join"
(https://claude.ai/artifact/8CMb1zH44cPFTwLHDGsZb6), with a German and an
English story in the first story's look: halloween.cowglow.io large, the
three steps with the app's real button labels, the line for people already
on the map, and two privacy points; plus status captions with the direct
request link (a link in a status image can't be tapped, one in the caption
can). Added both as PNGs to `docs/design/` (1080 × 1920, rendered with the
repo's Playwright and the @fontsource fonts; all five fonts loaded, nothing
overflows) and listed them in `docs/design/README.md`.
## 2026-10-26 - Merging #27-#30, and the dependabot PRs

Philip asked to merge the four stacked PRs in order and to take care of the
dependency PRs. Merged #27, #28, #29, #30 one at a time (each retargeted to
`main` first), each waiting for its Tests run and deploy, with an API
health check after each.

Dependabot: only patch/minor updates now. Rather than merge #7 (zod), #24
(@typescript-eslint/parser) and #26 (maplibre-gl) as they are (#7's
lockfile also re-resolved esbuild, rollup and babel), made the bumps with
`pnpm add` on `chore/safe-dependency-bumps`, and moved
`@typescript-eslint/eslint-plugin` to 8.71.2 with the parser (they are meant
to match). Checked: lint, frontend build, unit tests (48 + 121), e2e 27
passed (incl. the touch test) and the offline e2e against a production
build, on a fresh PGlite database. The majors wait for after the event, see
`TASK.md` item 4; their PRs stay open.
Rebasing onto `main` after #30 hit a `package.json` conflict: dependabot
#19 (globals 17.13) and #16 (Playwright 1.64) had been merged to `main`
meanwhile. Kept both plus maplibre-gl 6.14.0; `pnpm install
--frozen-lockfile` passes on both packages, lint/build/unit tests rerun
green.

## 2026-10-26 - Invites expire at the event end at the latest

Philip agreed to cap invite expiry at `EVENT_END_AT`. An invite sent within
7 days of the event used to say it worked until after the data was deleted
(e.g. "until Monday 2 November"); now its expiry, and the date in the email,
is `min(now + SPACE_INVITE_TTL_MS, EVENT_END_AT)`. Joining on Halloween
night itself already worked and still does. Branch
`feature/invite-expiry-cap` on top of #29; `InviteParticipantDeps` gets
`eventEndAt` (the router already had it). Backend tests: 121 passed (new:
the cap, and an early invite keeping its full 7 days). No frontend change, so
e2e wasn't rerun.

## 2026-10-26 - Emails in en/de/es

Philip asked for translated emails (all three were English only). Branch
`feature/email-translations`, stacked on `feature/request-access` (#28).
Plan: the app sends its current language with each action (optional,
defaults to "en" so a cached older frontend keeps working):
- sign-in link: in the language of the request, which is also saved as the
  participant's language;
- invite: in the inviter's language;
- allowed request: in the language the requester used (stored with it);
- "someone asked to join": in each participant's saved language.
Migration adds `language` (default "en") to `SpaceParticipant` and
`SpaceAccessRequest`. Copy moves to `infrastructure/mail/email-copy.ts`.

Result: done as planned. `domain/i18n/language.ts` (`LANGUAGES`,
`toLanguage` falls back to "en" for unknown stored values), `languageSchema`
(an enum defaulting to "en"; an unknown language is a 400), migration
`20261026180000_email_language`. The invite expiry is formatted per language
(en-GB/de-DE/es-ES, Europe/Berlin). Frontend sends `language` with
magic-link, invite, invite accept and access requests. Tests: backend 119
passed (new: copy for all three languages, the sign-in language is saved, the
notice goes out in each participant's language, an allowed request's invite
goes out in the requester's language, the English fallback for old clients),
frontend 48, e2e 27 on a fresh PGlite database with all four migrations.
Existing participants stay "en" until they next request a sign-in link.

## 2026-10-26 - Request access

Philip asked for people to be able to ask to join instead of waiting for an
invite. Decided with him: any participant can allow or deny, nobody can
remove a participant (people add and remove themselves). Branch
`feature/request-access`, based on `feature/invite-delete-and-email` (PR #27,
for `Mailer.sendInvite`). Plan:
- New `SpaceAccessRequest` (email, optional note, notice version, unique per
  space and email). Public `POST /spaces/:slug/access-requests` (IP rate
  limit, consent required, same reply whatever the email: no membership
  oracle).
- Participants: `GET /access-requests`, `POST /access-requests/:id/allow`
  (role chosen by the approver; runs the normal invite as them, then deletes
  the request), `DELETE /access-requests/:id` (deny: delete, nothing sent).
- Resend: when the waiting list goes from empty to non-empty, every
  participant gets one "someone asked to join" email, without the
  requester's address or note (stranger-written text shouldn't go out under
  our domain). At most one email per batch, no extra state.
- UI: "No invite yet? Ask to join" on the sign-in screen, a request page, a
  "N neighbors asked to join" button on the map for participants, a requests
  dialog with Allow (visitor/participant) and Deny. en/de/es.
- Privacy notice gets a section on requests; notice version bumped to
  2026-10-26. Requests are deleted by "Remove me" (by email), `purge:space`,
  `erase:participant` and the e2e cleanup.

Result: built as planned. Backend: migration
`20261026120000_access_requests`, `SpaceAccessRequestRepository` (Prisma
`createMany` with `skipDuplicates` so the unique constraint settles races),
`createRequestAccessUseCase` / `createAllowAccessRequestUseCase` (reuses
`inviteParticipant`, so the approver's invite limits apply; the request is
deleted only after the invite went out) / `createDenyAccessRequestUseCase`,
`Mailer.sendAccessRequestNotice`, IP limit 20 per hour. Allow and deny check
the request belongs to the space in the URL. Frontend: `RequestAccessPage`,
`AccessRequestsDialog`, the "N people asked to join" button on the map, a
menu entry, a privacy notice section (en/de/es). Tests: backend 113 passed,
frontend 48, lint and tsc clean, e2e 27 passed (new: ask twice, allow one
and accept as a visitor, deny the other; the note renders as text). E2E ran
on a fresh PGlite database (`pgbouncer=true`), Docker still not running.
Not done: emails are still English only; Philip asked about translations.
The plan for that is to pass the app's language with each request.

## 2026-10-26 - Deleting revoked invites, and an invite email of its own

Philip misspelled an invite address, revoked it, and had no way to get rid
of it. Plan, on branch `feature/invite-delete-and-email`:
- A revoked or expired invite gets a Delete button. Deleting erases the
  stored address (`email` set to "") and sets a new `SpaceInvite.deletedAt`
  that hides it from the inviter's list. The row stays so it keeps counting
  toward the per-inviter rate limit and lifetime cap; dropping it would let
  invite, revoke, delete loops get around both. Pending invites are revoked
  first; accepted ones can't be deleted (the participant row is the record).
- Invites were sent through `sendMagicLink`, so the email said "Your
  sign-in link ... expires in 15 minutes" while invites last 7 days. New
  `Mailer.sendInvite(email, url, expiresAt)` with its own text.

Result: done as planned. New `POST /spaces/:slug/invites/:id/erase` (204;
403 not the sender, 404 unknown or already deleted, 409 pending or accepted),
migration `20261026000000_invite_deleted_at` (one nullable column, applied by
the deploy's `prisma:deploy`), `createDeleteInviteUseCase`, a Delete button in
`InviteDialog.tsx` (en/de/es), and `buildInviteEmail` in `resend-mailer.ts`
(expiry in Europe/Berlin time). Tests: backend 98 passed (new use-case, route
and email tests), frontend 46 passed, lint and tsc clean, e2e 26 passed (the
invite test now revokes and then deletes). Docker wasn't running, so e2e ran
against `backend/scripts/dev-db.ts` (PGlite) with both migrations applied;
Prisma needs `pgbouncer=true` in `DATABASE_URL` there, or its prepared
statements collide on PGlite's single shared session (error 42P05).
Note for deploys: the API restarts before `prisma:deploy` runs, so for a few
seconds the new code queries a column that isn't there yet.

Decided for the next step (request access): any participant can allow or
deny a request, and nobody can remove Philip (or any participant); people
add and remove themselves.

## 2026-10-15 - README badges, generated by the workflows

The README's three badges were dropped in the 2026-10-03 cleanup (they
pointed at the visual-directory repo). Restoring them showed the two
workflow badges can't load: this repo is private, and GitHub serves a private
repo's workflow badges only to signed-in viewers (404 otherwise). Philip
chose to generate them. `scripts/status-badge.sh` writes a static
shields-style SVG (the old inline Hetzner badge code, now shared):
- `deploy.yml` writes `status-badge.svg` (API health right after the deploy,
  as before) and `deploy-badge.svg` (Publish Site: passing when the server
  deploy succeeded).
- `test.yml` writes `test-report/tests-badge.svg` from the unit and e2e
  steps' outcomes, on every push including failing ones. Not done in the
  deploy: the deploy only runs after Tests passed, so it could never show red.
README points at `https://halloween.cowglow.io/...`. Checked locally: the
script's SVGs are valid and render; the Hetzner badge matches the live one
within 2 px. Not yet run in CI (needs a push to main). Until the first run
after merging, the two new badge URLs 404.

## 2026-10-14 - Redesign: Pico CSS, Halloween theme, map-first mobile layout

Philip approved the mockups (Design canvas "Halloween Map Mockups": invite
landing, first visit, map home, add my house in two steps, menu) and asked
for the code. Working on branch `feature/pico-redesign`, because pushing to
`main` deploys.

Plan: replace `@sakun/system.css` with Pico CSS 2.1.1 (light theme only,
`data-theme="light"`); one theme file with Pico's variables (pumpkin
`#C2410C` primary, purple `#5B3A8C` secondary, warm white ground) plus the
few layouts Pico has no component for. The signed-in home becomes a
full-screen map with a top bar (menu) and, for participants, a bottom bar
("Add/Edit my house", "Invite neighbors"). Pin placement and the label/note
form become steps 1 and 2. The menu (a bottom sheet) holds language,
privacy, sign out and "Remove me". New welcome screen after accepting an
invite as a participant. Screens without a mockup (sign-in, list, visitor
map, edit/delete) get the same style.

New dependencies:
- `@picocss/pico` 2.1.1 (MIT): the CSS library Philip chose.
- `@fontsource/fredoka`, `@fontsource/nunito` (OFL-1.1): the mockups'
  rounded heading and body fonts, bundled so nothing loads from a font CDN
  (the CSP and SPEC section 3 forbid that). Only the latin subsets are
  imported.

Result: done on `feature/pico-redesign`. New: `app.css` (theme variables +
map-screen, bottom bar, sheet, nudge pad, steps; replaces `space-layout.css`),
`Icons.tsx`, `MenuSheet.tsx`, `WelcomeView.tsx`; every page component
rewritten; en/de/es strings rewritten (`common.back`, `brandSubtitle`,
`housesCount`, `stepOf`, the invite-landing and welcome texts, and others;
dropped `consentLabel`, `labelHint`, `noteHint`, `alreadyHavePin`,
`acceptInviteRole`, `cancelPlacement`, `myPinTitle`). `@sakun/system.css`
removed.

Decisions:
- The pin form's own consent checkbox is gone. It was UI-only (the GDPR
  consent record is written once, when the invite is accepted) and the
  approved mockup has none. SPEC section 9's "consent checkbox" is the one on
  the invite page.
- "Remove my house" moved into the edit form (Edit my house -> This is my
  front door -> Remove my house); "Remove me", sign out, language and privacy
  moved into the menu sheet.
- The welcome screen shows once, after a participant accepts an invite
  (router state, cleared on dismiss). Visitors go straight to the map.
- Sign-in page: the privacy link sits centered under the button (Philip's
  request); the language picker stays in the footer.
- Pico styles every `role="group"` as a joined button row and gives buttons
  inside a MapLibre popup the primary look, so the nudge pad and the popup's
  close button get explicit overrides; checkboxes get a 6px radius (the 14px
  theme radius made them look like radios).
- Found while checking German on a small phone: the map showed the OSM credit
  twice ("© OpenStreetMap-Mitwirkende | © OpenStreetMap contributors, ©
  Protomaps"). The translated credit now goes into the tile source's
  attribution and the extra custom attribution is gone.
- Own pin is purple, others pumpkin; the placement pin turns grey outside the
  village. Theme color and manifest colors are the warm white `#fffbf5`.

Checks: `pnpm build`, `pnpm lint`, 46 frontend unit tests, `pnpm test:e2e`
25/25 (selectors updated to the new names; the modal test now finds the
background button by CSS, since a modal takes the page out of the
accessibility tree). Phone-sized click-through screenshots of every screen in
English, plus the map and pin placement in German on an iPhone SE.
`pnpm test:e2e:spaces:offline` passed once mid-session; its rerun after the
attribution change hit the API's invite-accept rate limit (429) from running
the suites repeatedly; rerun once the limit cleared: 1/1 passed.

Follow-up (Philip): a second dev account and the moved-house bug.
- `SEED_SPACE_PARTICIPANT_EMAIL` now takes a comma-separated list
  (`seed-space.ts`, lowercased like the API). Local dev DB seeded with
  `cowglow@gmail.com,philip@cowglow.com`; both sign in directly in dev (the
  API hands back a devToken for any existing participant). The API image was
  rebuilt, since the script lives in it.
- Bug: after editing a house, the map didn't show the new spot until a
  List/Map toggle. Cause: saving switched back to the map before the houses
  were reloaded, so the map opened on the old list and fitted its view to it.
  `MapHomePage` now awaits the reload before returning to the map (save and
  delete). Found with it: `fitView` assumed the old 640x430 desktop map box,
  so on a 390 px phone the outermost house sat off-screen (x=1004 in one
  check). `LocationsMapView` now measures its box first and mounts the map
  with a fit for the real size.
- New e2e test: a second participant joins, adds a house from the welcome
  screen, both houses show (map and list, for both participants), and a
  moved house is on screen right after saving. Not verified to fail against
  the old code (that needs the whole serial suite, and the API's rate limit
  allows only a few runs per 15 minutes).

Checks: `tsc`, `pnpm lint`, frontend 46 + backend 91 unit
tests, `pnpm test:e2e` 26/26, offline 1/1.

## 2026-10-03 - Root SSH lockdown done

Philip asked for it. Found first: password login was ON
(`passwordauthentication yes`), root accepted keys (`prohibit-password`;
four keys including Philip's GitHub key and an unidentified
`SHA256:E6Ij0Qq…`), and there were no `sshd_config.d` drop-ins (the server
was created without cloud-init). The runbook's step 5 edited
`sshd_config` with sed, which loses to any earlier drop-in (first value wins
after the `Include`) and restarted `sshd` (the unit is `ssh`); runbook fixed.

- Added Philip's personal key (`b8JmDOm…`, his ssh-agent/GitHub key) to
  `deploy`, so he keeps access without the admin key's passphrase.
- `/etc/ssh/sshd_config.d/00-lockdown.conf`: PermitRootLogin no,
  PasswordAuthentication no, KbdInteractiveAuthentication no. `sshd -t`
  clean, `sshd -T` confirmed, `systemctl reload ssh`, with a ControlMaster
  fallback session open throughout.
- Verified from fresh connections: deploy + CI key OK (docker, sudo),
  deploy + personal key OK; root refused with any key; password login refused
  (server offers publickey only). Manual deploy run 37152459212 green, API
  healthy. Fallback closed. Root's authorized_keys left as-is (unusable over
  SSH now); the Hetzner web console remains the emergency path.

## 2026-10-03 - Pinning the CI runner

GitHub announced that `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19,
i.e. during the run-up to Halloween. Philip: change it now instead. All
workflows now say `runs-on: ubuntu-26.04` (matching the server's OS), so the
switch happens today, with time to fix anything, and never again
unannounced. Fallback if 26.04 breaks something: `ubuntu-24.04`. GitHub's notice
(actions/runner-images#14748) says the switch rolls out gradually from
2026-10-19 to 2026-11-19, so unpinned runs around Halloween could land on
either image. `.github/actionlint.yaml` declares the label, which the local
actionlint doesn't know yet.

## 2026-10-03 - Invitations verified in production

Philip sent invites from the live app and accepted one in a private window.
Production DB (read-only check): a visitor invite sent 18:17 and revoked
18:40; a participant invite sent 18:40, still open; a visitor invite sent
18:41 and accepted 18:44, which created that visitor participant (now 2
participants). No mail or error lines in the API log. So: invite email via
Resend, accept with consent, revoke, and role assignment all work live.
Note: the server's `.env` can't be `source`d by a shell (the unquoted
`<...>` in EMAIL_FROM); Docker reads it fine. Query the db with
`docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'`.

## 2026-10-03 - Cut the custom CSS back to the minimum

Philip: "We just need to use the least amount of modification to the
system.css." The first layout pass had ~250 lines / 35 rules, much of it
restyling system.css (11 font-family and 15 font-size overrides, custom
dialog chrome, taller and full-width buttons). Now 5 rules (27 lines):
white body (iOS black backdrop), `.page` column using system.css's own
`.window` font and padding values, `.field-row { flex-wrap: wrap }`,
full-width text fields, checkbox/radio label line height. Everything else
uses system.css's own classes: `.field-row` rows, `<h2 class="heading">`
(Chicago at 1em instead of its 2em h2), `.standard-dialog`, `<hr>`
separators. Accepted trade-offs (system.css defaults): 14px form labels, a 6px
indent on wrapped rows, compact buttons. Lint, unit 43, e2e 25/25, build,
offline 1/1; phone screenshots of all screens reviewed, "Remove me" confirm
button visible without scrolling, no page errors.

## 2026-10-03 - Removing the window chrome, one layout for every page

Philip: remove the window styling and fix the layout of all pages. Screenshots
of every screen (phone and desktop, German) showed: the system.css window
frame eating the width; a black area under the content on iOS (system.css
draws the dotted desktop with `background-attachment: fixed`, which iOS
ignores, so its black base shows); three buttons in a row clipped to
"Stecknad… bearbeite…"; labels beside fields; a giant h2; the picker glued
to the buttons.

- `SpaceWindow` → `SpacePage`: header (title, plus role and "Sign out" on the
  map), content, footer (privacy link + language picker). Dialogs lose their
  title-bar chrome too (title + a "×" close button).
- New `pages/space/space-layout.css`, the one stylesheet of our own, since
  responsive layout can't be done inline (CLAUDE.md updated): white body,
  centred 44rem column, label-above fields, `.actions` rows that go full
  width under 30rem, normal heading sizes, Chicago labels a size up (it
  draws small). system.css still draws the controls. `SECTION_HEADING` inline
  style removed again.
- Gotchas found on the way: `.page-main > * { margin: 0 }` also hit the
  `<dialog>`s rendered inside it and pinned them top-left (the browser centres
  a modal with `margin: auto`); now `:not(dialog)`. system.css's
  `input[type=checkbox] + label { line-height: 13px }` out-specified
  `.check label` and made wrapped consent text overlap; now
  `.check input + label`. On a phone the "Remove me" confirm button sat below
  the fold; dialogs get 15px text under 30rem (button bottom 587 of 664px).
- Checks: lint, unit 43, e2e 25/25, build, offline 1/1; screenshots of all
  nine screens on phone and desktop reviewed, no page errors.

## 2026-10-03 - Privacy page layout, German by default, language picker, auto deploys

Philip: the privacy statement doesn't render, a German translation is needed,
default to the browser's language, and turn on automatic deploys. Findings:
- Privacy page on a phone: the long title wraps out of the fixed-height
  system.css title bar, the h2s are ~3x body size, there's no way back to the
  map, and the deletion date is formatted in the browser's locale, not the
  app's (and in the viewer's time zone, not Europe/Berlin).
- `de.ts` is complete, but nothing ever selects it: no language picker
  exists, and the provider starts at "en" and *persists* that on first render
  (`useLocalStorage` writes on every render), so detection could never kick in.
- English leaks: two hard-coded strings in MapHomePage, the API client's own
  messages, and the backend's English `error` texts shown verbatim.
Plan: detect from `navigator.languages` unless the person picked one; a
native `<select>` picker on every page; set `<html lang>`; map API failures to
translated messages by status; fix the privacy page; deploy on green Tests.

Done:
- Found the actual "doesn't render": three privacy links were plain
  `<a href="/meckenhausen/privacy">`. Under the hash router that's a real
  path, and GitHub Pages answers it with its 404 page. Now `<Link>`. The e2e test
  had only ever opened the page by URL, so it now clicks the link.
- Privacy page: short titles that fit the title bar, `SECTION_HEADING` (the
  one added inline style, documented in `space-inline-styles.ts`), a "Back to
  the map" link, the date in the app's language and Europe/Berlin time.
- Language: `detectLanguage(navigator.languages)` unless a choice is stored
  under the new key `language` (the old `LANGUAGE` key stored "en" for
  everyone on first render and is ignored/removed; `use-local-storage.ts`
  deleted). `<html lang>` follows. A native `<select>` picker at the bottom of
  every window. New strings in en/de/es; Spanish uses "marcador" for pin.
- Errors: `apiErrorMessage()` maps status 0 → network, 429 → too many,
  otherwise the action's own translated message; the two hard-coded English
  strings are gone. Load errors are stored raw and translated at render, so a
  language switch updates them too.
- Deploys: `deploy.yml` on `workflow_run` of Tests (main, success only),
  checks out `workflow_run.head_sha`, concurrency group `deploy`; the client
  job's `always()` is gated too, or it would have published after red tests.
- Checks: tsc, lint clean; unit 43 (detectLanguage, apiErrorMessage new);
  e2e 25 (privacy link click + back + English date; German browser → German,
  `html lang=de`, German date; picker → English survives reload).

## 2026-10-03 - Deploying for real

Decisions (from Philip): API at `halloween.cowglow.io`; a new Hetzner project
for the server; Resend set up now; privacy controller "Philip Saa,
cowglow@gmail.com"; the site stays on `cowglow.github.io`. This overrides
CLAUDE.md's "never deploy or touch Hetzner" for this deploy, by explicit request.

- Dropped `GHCR_PAT`: the deploy job logs the server into ghcr.io with its own
  `GITHUB_TOKEN` (valid only while the job runs) and logs out after pulling.
  One less long-lived credential to create and later revoke.
- Updated the local `deploy/hetzner/config.env` (gitignored) for this repo:
  `GITHUB_REPO`, `SUBDOMAIN=halloween`, `SEED_SPACE_PARTICIPANT_EMAIL`.
- Set the repo variables (`API_DOMAIN`, privacy controller) and secrets
  (generated Postgres password and `SPACE_JWT_SECRET`, piped straight from
  `openssl` into `gh secret set`), and enabled GitHub Pages on `gh-pages`.
- Server: `halloween`, Ubuntu 26.04, [the server's IP], in the new Hetzner project.
  It was created without SSH keys and without the cloud config, and the root
  password was refused over SSH. That is expected: Ubuntu's sshd defaults to
  `PermitRootLogin prohibit-password`, while still offering the password
  prompt. The way in: Philip used the Hetzner web console to append
  `github.com/cowglow.keys` (his personal key) to root's `authorized_keys`.
  I then did by hand what the cloud config does: `deploy` user with both
  `cert/` keys, passwordless sudo, Docker 29.8.2 + Compose v5.6.0,
  `/opt/halloween-map`. Verified `deploy` login with the CI key and
  `docker run hello-world`, and that 80/443 pass the firewall (temporary nginx,
  removed).
- DNS: IONOS created `halloween.cowglow.io` with placeholder records (A
  [the old IP], AAAA 2001:8d8:...). A now points to [the server's IP], and the AAAA
  is deleted (it would have sent IPv6 clients and Let's Encrypt's checks to
  IONOS).
- Deploy run 37134743488: both jobs green. Containers up, `prisma migrate
  status` clean, `seed:space` created "Meckenhausen Halloween" with
  cowglow@gmail.com as the first participant.
- Production checks (`docs/VALIDATE_PRODUCTION.md` sections 2-5): health ok,
  Let's Encrypt cert for halloween.cowglow.io, CORS only for
  cowglow.github.io, no devToken, `/locations` 401, 9 kB body 413, site 200
  with the API URL and privacy name baked in, CSP `connect-src 'self'
  https://halloween.cowglow.io`, tiles 200 octet-stream.
- Still open: Resend (sign-in links are only in the API log until it's
  verified), the push trigger on `deploy.yml`, the old visual-directory-era
  phone/real-device checks, root SSH lockdown.
- Moving the site to its own domain (Philip's choice): site on
  `halloween.cowglow.io` (GitHub Pages custom domain, `public/CNAME`), API
  moves to `halloween-api.cowglow.io`. This also settles open decision 5: the
  session token no longer shares the `cowglow.github.io` origin with other
  Pages sites. The base path is now `/` everywhere (vite `base`,
  `CLIENT_APP_PATH = ""`, manifest, Playwright configs, e2e path checks)
  rather than configurable, since the site only lives on its own domain;
  the old github.io URL redirects. Verified locally: lint, build (dist/CNAME
  present), unit 35 + 91, e2e 24/24, offline 1/1, against a rebuilt API.
- DNS (Philip, IONOS): `halloween` A replaced by CNAME → `cowglow.github.io`;
  new `halloween-api` A → [the server's IP], no AAAA. `api.cowglow.io` (the
  visual directory, [its IP]) untouched.
- `API_DOMAIN=halloween-api.cowglow.io`, `CLIENT_ORIGIN=https://halloween.cowglow.io`,
  Pages custom domain set via the API, certificate approved, HTTPS
  enforced. Deploy run 37136401153 green. Gotcha: right after the deploy the
  site still served the previous build for a minute or two, because the Pages build
  (`gh api repos/.../pages/builds/latest`) was still "building"; wait for
  "built" before judging. Pages consumes `CNAME` and serves it as 404; that's
  expected.
- Checked live: site 200 with the new bundle (API `halloween-api.cowglow.io`
  in code and CSP, manifest `/`), http → https, old github.io URL → 301 to the
  new domain, tiles 200, API health + Let's Encrypt cert for
  halloween-api.cowglow.io, CORS only for https://halloween.cowglow.io, the
  seeded space intact.
- Bug found on the live site (Philip: "doesn't render correctly"): Vite
  inlines assets under 4 kB as data: URIs, including the
  `@sakun/system.css` fonts, and the CSP's `font-src 'self'` blocks data:
  fonts, so production fell back to Times. This predates the domain move. It
  was missed because the CSP check in e2e runs against the dev server
  (fonts served as files); the offline test, the only one on a production
  build, didn't check CSP. Fix: `build.assetsInlineLimit` never inlines font
  files (CSP stays strict), and the offline test now fails on any CSP
  violation. Proven: without the fix the new check fails, with it it passes;
  e2e 24/24. The local dev containers had vanished between sessions
  (re-created with `pnpm backend:up`, migrate, seed).
- Resend done. The `mail.cowglow.io` records (MX + SPF on `send.mail`, DKIM
  on `resend._domainkey.mail`) already existed at IONOS from the visual
  directory. Philip reused that Resend API key (decision: simpler now; the
  trade-off is that teardown can't revoke it without breaking the visual
  directory's mail). `EMAIL_FROM="Meckenhausen Halloween map
  <login@mail.cowglow.io>"`, redeploy run 37139402540. A sign-in request for
  cowglow@gmail.com produced no console-mailer line and no send error, and
  Philip received the email.


## 2026-10-03 - Pre-deploy session: everything up to the Hetzner setup

Working through `TASK.md`'s open items that don't need the hosting decisions,
stopping at the Hetzner server setup. One commit per step.

- Committed the directory-reference cleanup that was sitting uncommitted in
  the working tree (a760eb2). Verified first: lint, build, frontend 33 and
  backend 83 unit tests green.
- SPEC §8 body limit: `express.json({ limit: "8kb" })` via
  `ports/http/middleware/json-body.ts`. Not 2 kB as TASK.md guessed: a pin
  with a 60-emoji label and 500-emoji note is ~2.3 kB of UTF-8 JSON. Found
  along the way: body-parser errors (413, malformed JSON) fell through to
  `errorHandler` as a 500 *and* were `console.error`ed, and a JSON parse
  error carries the raw request body on `err.body`, which broke "never log
  request bodies". `errorHandler` now answers them with their own 4xx status
  and logs nothing. Two route tests added (backend 85 green).
- Phone testing (TASK.md item 3, first half): `pnpm dev:lan` sets
  `VITE_API_URL=/api`; the Vite dev server proxies `/api/*` to `:4000`, so a
  phone sees one HTTPS origin. CSP `connect-src` skips a relative API URL.
  Replaced docs/DEV-HTTPS.md's "why the API isn't proxied" section, which
  had only considered cookies and missed mixed content. Verified: `/api/health`
  through the proxy, and the whole e2e suite (23/23) run against a
  `VITE_API_URL=/api` dev server. Not verified: an actual phone (needs you).
  Invite links still use the API's `CLIENT_ORIGIN`; the doc says how to
  point it at the LAN IP.
- SPEC §5 mobile touch test: `e2e/spaces/touch.spec.ts` (Pixel 7, CDP touch
  events, so `touch-action` really applies). Checks that a one-finger pan
  changes the announced position, that a pinch changes the map, and that
  `scrollY`/`visualViewport.scale` don't move. Mutation-checked: it fails
  with `dragPan={false}` and with `touchZoomRotate={false}`. Full e2e 24/24.
- SPEC §6 cache hygiene, decided: clear Cache Storage too, as the spec says.
  It holds only static files, but the tile archive is just 2 MB, so following
  the spec literally costs little. `forgetSpaceLocally()`
  (`infrastructure/space-cache/forget-space.ts`) clears the session, the
  IndexedDB pins and this app's caches. `MapHomePage` now uses it on all of
  sign-out, 401, "Remove me" and 410. Fixed on the way: the 410 paths left the
  session token in localStorage, and a 401/410 on a *write* (save/delete pin)
  only showed "save failed".
- Found and fixed: the service worker's `activate` deleted *every* cache on the
  origin except its own. In production the origin is `cowglow.github.io`,
  shared with every other Pages site of the account, so it would have wiped
  their caches. Caches are now named `halloween-map-v6` (strategy unchanged,
  version bumped for the rename) and only `halloween-map-*` / the old `map-vN`
  are ever deleted (`app-caches.ts` mirrors this; unit-tested). The e2e
  "Remove me" test now checks that the tiles leave Cache Storage, another
  site's cache survives, and the session is gone. Mutation-checked.
- Not fixed, for the deploy decision: localStorage (the session token) and
  IndexedDB are per *origin* too. On `cowglow.github.io` any other Pages site
  of the account can read this app's session token. A custom domain for the
  frontend (e.g. `halloween.cowglow.io`) would isolate it.
- SPEC §6 service worker updates, decided: no reload prompt. The build has no
  lazy chunks, the worker activates at once and the HTML is network-first, so
  the next open runs the new version. Reasoning is in `public/sw.js`, which
  pointed to an "update-handling note below" that didn't exist.
- Gotcha: running the e2e suite about five times within 15 minutes trips the
  API's sign-in rate limit (20 per 15 min per IP), and every test then fails
  with "No devToken". `docker compose restart api` resets it.
- Moved the README image from `public/` (it shipped in every build, 800 kB,
  unused by the app) to `docs/halloween-trick-o-treating-opt-in.png`.
- Backend env parsing (`infrastructure/config/env.ts`): an unset compose
  variable arrives as `""`, which made `EVENT_END_AT` an Invalid Date (the
  map would never close: `Date.now() >= NaN` is false) and the invite limits
  `0`. Empty now means "use the default" and garbage stops startup. 6 unit
  tests (backend 91).
- Rebuilt the local `halloween-map-api` image. The dev stack runs a built
  image, not the source, so e2e had been testing the old backend. Against
  the rebuilt image: a 9 kB body gets a 413, nothing is logged, e2e 24/24.
- Deploy files renamed, nothing deployed: `/opt/halloween-map`, image
  `ghcr.io/cowglow/halloween-map-api`, compose project and containers
  `halloween-map`. The API domain is now one GitHub Actions variable,
  `API_DOMAIN`. It feeds `VITE_API_URL`, the status badge and Caddy's site
  address (`{$API_DOMAIN}`, checked with `caddy adapt`). Both deploy jobs
  fail early if it is unset, and so does the prod compose. Also: dropped
  the Storybook build step (no such script here, so the client job would
  have failed), dropped `JWT_SECRET`, and pass `EVENT_END_AT` (optional
  variable). actionlint is clean apart from a pre-existing shellcheck info
  in the badge arithmetic.
- Rewrote the deployment docs for this app: `HETZNER_DEPLOY.md`,
  `HETZNER_REBUILD.md`, `VALIDATE_PRODUCTION.md`, `RESEND_EMAIL_SETUP.md`,
  `TEARDOWN.md`, and fixed paths in `WEBSTORM_PG_SETUP.md`. The old versions
  described the directory: `pnpm seed`/`seed:demo`, leader accounts,
  `JWT_SECRET`, migration names that no longer exist, `docker compose up
  adminer` on a prod stack that has no Adminer, and backups described as a
  gap to close. Here backups are deliberately absent, because the data must
  not outlive the event. Checked against the running stack: the operator
  scripts run inside the production image (`erase:participant -- --email`
  on an address that matches nobody), `purge:space` dry-runs without
  `--yes`, the CORS preflight answers with the configured origin, and an
  unauthenticated `/locations` gives a 401.
- `deploy.yml` now passes `PRIVACY_CONTROLLER_NAME`/`_CONTACT` (repository
  variables) into the build and refuses to publish the privacy notice with
  placeholders.
- `TASK.md` rewritten: what's left is the Hetzner setup (blocked on the
  hosting and domain decisions), the `.env.example` files (yours), real-phone
  testing, and teardown after the event. Added decision 5, the shared
  `cowglow.github.io` origin.
- Stopping here: the next step is provisioning the server.
- Pushed; CI (`test.yml`) failed in two ways. (1) The service-worker e2e
  check: CI has no mkcert, so the dev server uses a self-signed certificate,
  and Chromium won't register a service worker on an origin with a
  certificate error, `ignoreHTTPSErrors` notwithstanding. The suite is serial,
  so everything after it was skipped. Reproduced locally by moving the mkcert
  files aside; `--ignore-certificate-errors` in both Playwright configs fixes
  it (24/24 and offline 1/1 without mkcert, 24/24 with it). (2) Publishing
  the test report got a 403, which the run before this session also had: the
  default workflow token is read-only. Added `contents: write` to `test.yml`
  and `deploy.yml`'s client job, and `packages: write` to the server job,
  which would otherwise have failed to push the image to ghcr.io.

## 2026-10-03 - Repo split from visual-directory; removing the directory app

The Halloween map now lives in its own repo (`cowglow/halloween-opt-in-trick-o-treating`,
`main` = the old `feature/opt-in-signups`). `cowglow/visual-directory` was not
changed; it is kept as the `visual-directory` git remote. `deploy.yml` is
manual-only (`workflow_dispatch`) because it still targets the directory's
Hetzner box and `api.cowglow.io`.

Plan for this cleanup, one commit per step:
1. Dev Docker stack renamed `visual-directory` -> `halloween-map` (project and
   container names). Found while planning: both clones used the same compose
   project, so they shared one Postgres volume (`visual-directory_postgres-data`)
   and a migration run here would have hit the directory's local data. Host
   ports (5432/4000/8081) are unchanged, so only one of the two stacks can run
   at a time. `docker-compose.prod.yml` is left as is (Hetzner is out of scope).
2. Backend: delete Account/Member/Organization/AuditLogEntry/MagicLinkToken, the
   `/auth`, `/members`, `/organizations` routes and their code; squash the
   migrations into one fresh `init` (safer than a DROP migration: run against
   the directory's database by mistake it fails instead of deleting data).
3. Frontend: delete everything not reachable from `spaces-main.tsx`, the
   directory e2e specs and Storybook; make the Spaces app the root entry.
4. Docs, translations and dependencies.

Step 2 result (backend): deleted Account/Member/Organization/AuditLogEntry/
MagicLinkToken (schema, domain, repositories, `/auth` `/members`
`/organizations` routes, `require-auth`/`require-role`, the directory JWT
signer, `seed.ts`/`demo-seed.ts`). Kept the shared pieces the Spaces code
uses: `domain/auth/magic-link.ts`, the mailer, the token generator and the
magic-link request/verify zod schemas. Migrations squashed into
`20261003000000_init`, generated offline with `prisma migrate diff
--from-empty` (no database touched). Any existing local database for this repo
needs `prisma migrate reset`; the new `halloween-map` compose volume starts
empty anyway. `pnpm backend:seed` now runs `seed:space`
(`SEED_SPACE_PARTICIPANT_EMAIL`). Backend `tsc` clean, 82 unit tests pass (the
4 fewer are the deleted audit-hash tests). `JWT_SECRET` is gone from the dev
compose file; `docker-compose.prod.yml` and `deploy.yml` still pass it
(harmless, left with the rest of the Hetzner config).

Step 3 result (frontend): deleted the 98 source files not reachable from
`frontend/spaces-main.tsx` (computed with `tsc --listFilesOnly` on that entry;
the Spaces unit tests were kept), all of `ports/components/`, Storybook
(`.storybook/`, scripts, 21 packages), the directory e2e suite and
`playwright.config.ts`, the legacy `.eslintrc.cjs` (ESLint 9 only reads
`eslint.config.js`), the directory's `public/` assets, and every translation
section except `common` (cancel/close/retry), `spaceApp` and `spacePrivacy`.
Removed packages: redux-saga, @reduxjs/toolkit, react-redux, @mui/material,
@mui/icons-material, @emotion/react, @emotion/styled, styled-components,
storybook, eslint-plugin-storybook, @chromatic-com/storybook, @storybook/*.
`pnpm test:e2e` now runs the Spaces suite; CI (`test.yml`) seeds a space with
`seed:space` instead of a leader. Not run in CI yet.

Decision: the app stays at `<base>/spaces/`; the root `index.html` is a meta
refresh into it. Moving it to the root would also move the service worker
(its scope can't cover a parent path on GitHub Pages without a
`Service-Worker-Allowed` header), the manifest scope, the tile cache paths,
the magic-link URLs and the e2e URLs. That needs an e2e run, and this session
can't start this repo's stack: the visual-directory clone's containers are
running on the same host ports. Same for the `base: "/visual-directory"` path,
which has to change before deploying to this repo's own GitHub Pages
(`/halloween-opt-in-trick-o-treating/`).

Checks: `pnpm build` and `pnpm lint` clean; frontend 33 unit tests pass (the
18 fewer were directory tests); e2e not run (see above).

Step 4 result (docs): rewrote `CLAUDE.md`, `README.md` and
`docs/CLEAR_ARCHITECTURE_TS.md` for the Halloween app (the architecture doc's
Redux/saga section is gone with Redux). Deleted the directory-only docs:
`PLAN.md`, `USER_MANUAL.md`, `PRIVACY.md` (the Halloween privacy notice is the
in-app `PrivacyNoticePage`), `ABOUT.md`, `INITIAL_ORGANIZATION_MAP.md`, two
directory screenshots, and the root `new-direction.md`/`Feedback.md` (Feedback
was fully addressed, see the 2026-09-23 entry). Left as is: the Hetzner,
Resend, SSH and WebStorm guides (infrastructure, still accurate as reference)
and older WORKLOG entries.

Still open from this cleanup:
- `base: "/visual-directory"` and the `/spaces/` sub-path (see step 3).
- `.env.example` (root and backend) may still list directory-only variables
  (`JWT_SECRET`, `SEED_LEADER_EMAIL`, `DEV_SEED_LEADER_EMAIL`); I can't read
  those files in this session, so check them by hand.
- `docker-compose.prod.yml`, `deploy.yml`, `backend-up/down.yml` and
  `deploy/hetzner/` still name the visual-directory server and image.
- Internal names still say "Space"/"spaces" (fine, but a rename to something
  Halloween-specific would be a separate refactor).
- e2e (`pnpm test:e2e`) not re-run after the cleanup.

Getting `pnpm dev:up` working (same day): it failed because the
visual-directory stack (other clone) held ports 5432/4000/8081, so this
stack's containers were created but never started, and the db container was
left with no network (`db` didn't resolve from the api). Stopped the
visual-directory containers (`docker stop`, data kept; `docker start
visual-directory-db visual-directory-api visual-directory-adminer` restores
them) and force-recreated `halloween-map-db`. Then `pnpm backend:seed` failed:
the production image only had `dist/`, but `prisma/seed-space.ts` imports
`src/application/space/space.use-cases.js` (old bug, the directory's seed only
used Prisma). The Dockerfile now copies `src/` and `tsconfig.json` into the
image. Result: migrate, seed (`cowglow@gmail.com`), magic-link sign-in OK, and
`pnpm test:e2e` 23/23 passed against the live stack. So the e2e item above is
done.

App moved from `<base>/spaces/` to `<base>/` (user request): `spaces/index.html`
is now the root `index.html` (the redirect page is gone), `public/spaces/*`
moved to `public/`, the MapLibre worker is emitted under `maplibre/`, the CSP
is injected into the one page, and the magic-link/invite URLs are
`<origin><base>/#/<slug>...`. The service worker's scope is now the whole app,
so it no longer caches "everything in scope": it derives its base from
`registration.scope` and caches only `assets/`, `tiles/`, `fonts/`,
`sprite/`, `maplibre/`, the icons and the manifest (plus network-first
documents). Otherwise, in dev, it would cache Vite's source modules
cache-first and serve stale code. `CACHE_VERSION` bumped to `map-v5`. A browser
that ran the old build keeps a dead worker registered at `.../spaces/`; it
controls nothing anyone visits now, so it's harmless. `base` itself is still
`/visual-directory` (also hard-coded in `CLIENT_APP_PATH`, the manifest,
Playwright configs and the e2e specs). Added exact-URL unit tests for both
emailed links. Checks: build, lint, frontend 33 + backend 83 unit tests,
`pnpm test:e2e` 23/23, `pnpm test:e2e:spaces:offline` 1/1.

Found while checking: the API's logs show Resend rejecting sends ("gmail.com
domain is not verified"), so `backend/.env` sets `RESEND_API_KEY`/`EMAIL_FROM`
with a gmail.com sender. Dev sign-in still works (the API returns a
`devToken`), but no email goes out and links don't show up in the logs.
Unset both for console links, or verify a domain in Resend.

Base changed `/visual-directory` -> `/halloween-opt-in-trick-o-treating/`
(this repo's GitHub Pages path). One `BASE` const in `vite.config.ts` feeds
`base` and the MapLibre worker plugin; it is mirrored (by hand) in
`CLIENT_APP_PATH` (backend, no trailing slash), `public/manifest.webmanifest`,
the Playwright configs, e2e specs, unit tests and
`scripts/capture-onboarding-screenshots.mjs`. The service worker derives the
base from its scope. Left alone: references to the visual-directory repo,
its Hetzner/Resend/validation docs and `docker-compose.prod.yml`. Checks:
build, lint, 33 + 83 unit tests, e2e 23/23, offline 1/1. Dev URL is now
https://localhost:3000/halloween-opt-in-trick-o-treating/.

Docker/port fix: after a `docker compose down` + `up`, no containers existed and
the user's `pnpm dev` came up on :3001. Causes: my background Vite still held
:3000 (stopped it), and a plain `docker compose up` also starts the optional
`frontend` container, which binds :3000 too, so the whole `up` failed. The
`frontend` service now has `profiles: ["frontend"]` (`pnpm docker:dev`'s
`compose run` still targets it, checked with `--dry-run`), and `pnpm dev`
uses `--strictPort`: on :3001 the API's CORS origin (`https://localhost:3000`)
blocks every request, so failing loudly is better than silently moving.
`pnpm backend:up` came up cleanly; the volume kept the migrated, seeded data.

Repo renamed on GitHub (user request): `cowglow/halloween-opt-in-trick-o-treating`
-> `cowglow/halloween-trick-o-treating-opt-in` (`gh repo rename`; GitHub
redirects the old URL). `origin` updated. The GitHub Pages path follows the
repo name, so the base is now `/halloween-trick-o-treating-opt-in/`
everywhere the previous entry lists, plus the package name and README title.
Entries above keep the old name as history. Not renamed: the local folder
(`~/WebstormProjects/halloween-opt-in-trick-o-treating`), the image
`public/Halloween-Opt-In-Trick-O-Treating.png`, and the compose project
(`halloween-map`). Checks: build, lint, 33 + 83 unit tests, e2e 23/23,
offline 1/1.

Removed the "← Back to the directory" link from both MapHomePage screens
(signed out and signed in) and its en/de/es strings; missed in the first
cleanup. It linked to the base URL, which is now the app itself. Also: the
user moved `FamilySurnames.md` to `docs/`, so `e2e/spaces/spaces.spec.ts`
reads it from there now. Checks: build, lint, 33 unit tests, e2e 23/23.

Audit of the old TASK.md against the code (2026-10-03): sections 1-9 are
implemented, with the deviations listed at the top of the new `docs/SPEC.md`.
Gaps found: Cache Storage isn't cleared on sign-out/401/remove/410 (only
IndexedDB and the session; it holds no personal data); no mobile/touch e2e
test; no explicit request body limit (express default 100 kB); no
"new version" prompt for service worker updates; the API isn't proxied
through Vite, so phone-over-LAN still doesn't work; `.env.example` still
blocked. Already done and verified: access-log retention (Caddy 7 days, Docker
log caps in `docker-compose.prod.yml`), ETag/304, 410 handling, purge/erase
scripts, TEARDOWN.md, attribution, pinned maplibre-gl/pmtiles. The original
requirements moved to `docs/SPEC.md`; `TASK.md` is now the brief for the
next task (deploy decisions, then the open items above).

## 2026-09-23 22:38 CEST - Wishlist done: docs/MAPLIBRE-ONBOARDING.md, and what writing it found

`docs/MAPLIBRE-ONBOARDING.md` (with 12 screenshots in `docs/images/maplibre/`):
a tour of how this app uses MapLibre - the model, the `.pmtiles` data, the
style, the controlled camera, markers/popups, the fixed-centre pin, the
service worker - a "things that went wrong" table, and 9 exercises. Pictures
01-06 come from `scripts/capture-onboarding-screenshots.mjs` (re-runnable;
creates and removes one throwaway participant); 07-09 are one-line temporary
edits that were reverted (described in the guide's appendix). Every command,
layer id, tile coordinate and line reference in it was checked against the
real tools - checking caught four wrong details in my first draft (invented
tile coordinates, "house numbers at ~z19" (it is z18), "ten" vs nine layers,
and a `HEAD`-vs-`GET` claim I had not verified).

Making the pictures, and the offline test, found **more real bugs** (all fixed,
all now covered by tests, commits `731001c`, `143ef2c`, `05efdc7`, `a714cfe`):

- The read-only map could not be panned or zoomed (controlled camera, no
  `onMove`).
- Pin popups never opened (double toggle + close-on-map-click).
- The initial view centred on the first pin, so your own pin could be
  off-screen; `fitView()` now fits all pins.
- The pin-placement announcement only followed the nudge buttons, not drags or
  keyboard pans; "Use my location" from outside the village left a blank grey
  map (now recentres with an explanation).
- **Offline did not work**: the village-name request failed the whole page; the
  tile-availability `HEAD` bypassed the service worker; and the worker did not
  cache the production build's `/assets/` (so an offline production load had
  HTML but no scripts). New `pnpm test:e2e:spaces:offline` runs against a
  production build (verified to fail without the worker fix).

Test totals at this point: backend 86 unit (incl. 29 HTTP route tests),
frontend 51 unit, `pnpm test:e2e:spaces` 23 (browser + API + Postgres),
`pnpm test:e2e:spaces:offline` 1. `pnpm build` and `pnpm lint` clean.

Facts worth knowing that are now written down: the village boundary IS the
`maxBounds` rectangle (no OSM polygon exists), so panning can never leave it;
"outside" is only reachable via geolocation. The archive stops at z15 (higher
zooms are MapLibre overzoom). `maxBounds` constrains the *viewport*, raising
the effective minimum zoom to ~13.5 on a 646 px-wide map.

Still open (unchanged): `.env.example` lines (blocked for me - see the older
entries), `EVENT_END_AT`/prod env, phone-over-LAN needs the API on HTTPS +
CORS for the LAN origin, and the directory app's own map probably has the
same MapLibre-worker problem in a production build (not touched).

## 2026-09-23 22:06 CEST - Feedback.md pass: DONE (details of what was found)

All of `Feedback.md` addressed; verified by `pnpm test:e2e:spaces` (19 tests,
~11 s, real browser + real API + real Postgres), plus frontend 42 / backend 57
unit tests, `pnpm build`, `pnpm lint`.

1. **"Unable to remove me from the map"** - real bug, fixed (commit `60038f0`).
   `DELETE /me` 500'd for anyone who had invited someone who accepted (FK
   `SpaceInvite_inviterParticipantId_fkey`); it also left an erased person's
   email in used-invite rows. `deleteCascade` now deletes every invite they
   sent or that was addressed to their email. Regression-tested in e2e
   ("participant who has an accepted invitee can remove themselves"); a fake
   in-memory repository cannot catch this class of bug, so it lives in e2e.
2. **"Tiles aren't being served"** - three separate bugs, all fixed:
   (a) asset URLs were `/visual-directoryspaces/...` (BASE_URL has no trailing
   slash - **also in the production bundle**), so tiles/sprite/SW 404'd and
   Vite's HTML fallback passed the "is the archive there?" check; (b) the
   maplibre-gl 6 tile worker module was never served (dev or build), so tiles
   loaded but nothing painted - a small Vite plugin now serves/emits it and
   `setWorkerUrl` points at it; (c) the SW could cache that HTML as "tiles".
   The main directory app uses the same maplibre-gl and probably has bug (b)
   too - **not touched, worth a look**.
3. **system.css only** - `space-pages.css` deleted. Screens use `.window` /
   `.title-bar` / `.separator` / `.field-row` and native controls. The only
   styling we still write is `space-inline-styles.ts` (a sized box for the
   map, the centre-marker overlay, marker-button reset, `pre-wrap` for notes)
   - things MapLibre/the browser physically need. system.css hides native
   checkboxes/radios and draws them on the adjacent `<label>`, so those are
   `<input id>` + `<label htmlFor>` pairs.
4. **Invite as an accessible modal** - `InviteDialog` on a shared
   `SpaceDialog` built on native `<dialog>.showModal()` (focus trap, inert
   background, Escape, focus returns to the opener, labelled by its title).
   Role choice is a radio group (the `<select>` truncated its text). Remove-me
   and delete-pin are `alertdialog`s that start focus on Cancel;
   `window.confirm` is gone. Asserted in e2e.
5. **Surname placeholder** - "Cage" -> "Addams" (en/de/es); the e2e picks a
   random surname from `FamilySurnames.md` for its pin names.
6. **A test covering all actions** - `e2e/spaces/` (+ its own
   `playwright.spaces.config.ts`, `pnpm test:e2e:spaces`, README). It also
   asserts no CSP violations and **no request to any origin but the app and
   the API**.

Bug found by that e2e and not by any unit test: the frontend read
`participant.participantId` off the sign-in/accept responses, but the API
returns `participant.id`, so after signing in through the UI the app never
knew which pin was yours (no "Edit your pin", own pin drawn as someone else's).
Fixed with a typed `toSpaceSession()` (unit-tested).

Housekeeping: (a) my `60038f0` commit accidentally included the user's
already-staged `Feedback.md` and an empty `FamilySurnames.md` (harmless; the
surnames content is committed with the e2e). (b) The magic-link rate limit
(20 / 15 min / IP, in memory) made repeated e2e runs 429 - the suite now
shares one seed session (~4 requests/run); `docker compose restart api`
clears the counters. (c) Rows created by my manual testing
(`e2e-repro-*`, `neighbor@example.com`) were deleted from the local dev DB;
the user's real invite to a neighbor was left alone.

Wishlist (user, 22:06): an onboarding markdown, with pictures, that teaches
MapLibre using this code as the example - queued next.

## 2026-09-23 21:47 CEST — Feedback.md pass (in progress)

Started on `Feedback.md` (user-authored, repo root) plus the surname request
(`FamilySurnames.md`). Its items, and where each stands as of this entry:

1. **"Unable to remove me from the map"** - REPRODUCED at ~21:45 and root-caused.
   `DELETE /spaces/:slug/me` returns 500 for any participant who has invited
   someone who accepted: `SpaceParticipant.deleteCascade`
   (`backend/src/infrastructure/prisma/space.repository.ts`) only deletes the
   *unaccepted* invites they sent, but accepted ones still reference them via
   `SpaceInvite_inviterParticipantId_fkey`. My 21:00 curl pass missed it
   because the visitor I removed had never invited anyone. It is also a GDPR
   gap: an accepted-invite row keeps the erased person's email. Fix (next):
   delete every invite they sent *or* that was addressed to their email.
2. **"Tiles aren't being served"** - not yet investigated in a browser (curl
   showed 200/206 for the file, so suspects are the service worker's old
   `spaces-v1` cache holding Vite's HTML fallback for the then-missing tile
   path, and `SpaceMap`'s HEAD-based availability check being fooled by that
   same fallback).
3. **Use system.css, write no CSS of our own** - pending (`space-pages.css`
   and inline styles to go; only what MapLibre physically needs may stay).
4. **"Invite a neighbor" as an accessible modal dialog** - pending (plan:
   native `<dialog>` + `showModal()` for focus trap/Escape/inert background).
5. **Fun detail**: pin-name placeholder uses a surname from
   `FamilySurnames.md` instead of "Cage Family" - pending.
6. **"Need a test that covers all the actions"** - `e2e/spaces/` +
   `playwright.spaces.config.ts` drafted (uncommitted); to be extended to
   cover every action, and run.

## UPDATE (2026-09-23, ~21:20-21:35 CEST) — blockers 1-3 below are resolved; read this before the older summary

_Times below are from the git commits: dev-bypass fix 21:23, tiles/assets/icons/SW 21:31, dev-cert script fix 21:33. From here on every entry carries its own HH:MM._

- **DB reset + live integration pass done** (you ran `prisma migrate reset`).
  Against the real Postgres via the rebuilt `api` container: magic-link ->
  verify -> `/me`, invite create/list (no `tokenHash` leaked) -> accept ->
  visitor 403 on pin write / participant 201, boundary check (Meckenhausen
  pin 201, Berlin pin 400), ETag -> 304, `DELETE /me` -> 204 then 401 on
  reuse, DB rows cascade-deleted as designed, unauthenticated -> 401. Note
  the `api` compose service is an *image build*: rebuild it
  (`docker compose build api && docker compose up -d api`) after backend
  changes or it serves stale code.
- **Dev sign-in bypass fixed**: `devToken` (auto-consumed by
  `MapHomePage.tsx`) was never returned when the real Resend mailer was
  configured but rejected the send (e.g. gmail.com is not a verified Resend
  domain). In dev mode a send failure is now logged and the response still
  carries `devToken`; production still fails hard. Commit `1bce2d5`.
- **Tiles built**: `scripts/build-tiles.sh` was wrong about the build list.
  The real one is `https://build-metadata.protomaps.dev/builds.json` (sorted
  oldest-first; each `key` is a file under `https://build.protomaps.com/`).
  Script fixed (also accepts `PMTILES_BIN`) and run with go-pmtiles 1.31.2
  (downloaded to /tmp, no global install): `public/spaces/tiles/
  meckenhausen-v1.pmtiles`, 2.1 MB, from the 20260923 build, bbox + ~300 m
  buffer. Dev server serves it with working HTTP Range (206).
- **Glyphs + sprites bundled** from `protomaps/basemaps-assets`: Noto Sans
  Regular/Medium/Italic (the three faces `@protomaps/basemaps` layers use)
  **trimmed to Latin ranges only** (0-767, 7680-8703; 1.7 MB instead of
  ~13 MB) plus `OFL.txt` alongside, and the v4 `light` sprite as
  `sprite/sprite{,@2x}.{json,png}`. If a label ever needs a glyph outside
  those ranges (e.g. non-Latin OSM names) copy more `<range>.pbf` files from
  that repo; missing ranges just 404 and render as blanks.
- **PNG icons generated** with macOS `qlmanage`/`sips` (no install):
  `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (the maskable one
  is rendered from the SVG with a full-bleed square background so squircle
  masks show no transparent corners).
- **Service worker bug fixed**: it was cache-first for *everything* in
  scope including the unhashed `index.html`, which would pin users to their
  first-loaded app version forever. Page navigations are now network-first
  with cache fallback (offline still works); `CACHE_VERSION` bumped to
  `spaces-v2`.
- Still open: real-browser/phone check (needs a trusted mkcert cert - the
  dev server runs in the container, which has no mkcert), `.env.example`
  lines, `EVENT_END_AT`/prod env, Playwright e2e specs.

## SUMMARY (2026-09-21 session) — read this first

TASK.md asked for the full Meckenhausen Halloween map pivot. Section 0's
claim that a prior session had already half-built the backend **was false**
(see the finding below) - I built from the actual starting point (the
generic dynamic-field Spaces prototype), not from that description.

### What's done and verified (build/lint/test all green)

- **Backend**: full schema rewrite (`Space`/`SpaceParticipant` with
  `role`/`consentAt`/`noticeVersion`/`SpaceLocation`/`SpaceInvite`),
  invite-only sign-up with anti-enumeration, expiring/revocable/rate-limited/
  capped invite tokens, ownership-checked pin CRUD, hand-rolled
  point-in-polygon boundary validation (client *and* server), NFC-normalized/
  control-character-rejecting text validation, `EVENT_END_AT` → 410 gating,
  `pnpm seed:space`/`purge:space`/`erase:participant` operator scripts, a
  strict CSP for the Spaces app, and Docker/Caddy access-log retention (was
  unbounded before this). **52 backend tests pass** (`cd backend && pnpm
  test`), covering invite/ownership/role-escalation/boundary/validation
  logic against fake in-memory repositories - not against a live database
  (see the blocker below).
- **Frontend**: self-hosted MapLibre map (pinned `maplibre-gl`/`pmtiles`
  versions, `@protomaps/basemaps` for style layers, pmtiles protocol
  registered, `maxBounds` enforced, a real working placeholder style since
  the real tiles aren't available yet - see below), mouse/touch/keyboard pin
  placement with nudge buttons, an `aria-live` region, Escape-to-cancel, and
  `prefers-reduced-motion` respected throughout, map/list toggle, invite
  panel, remove-me flow with the fairness copy, bilingual (en/de, plus es
  since the shared `Translations` type requires it) privacy notice, a
  hand-rolled service worker + IndexedDB location cache with ETag
  revalidation, and a PWA manifest. **32 frontend tests pass** (`pnpm test`),
  including a static scan asserting no file in the feature ever uses
  `innerHTML`/`dangerouslySetInnerHTML`/`setHTML`.
- `pnpm build` and `pnpm lint` (both frontend and backend) are clean.
  `pnpm dev:https` starts and serves correctly (verified with `curl -sk`
  against the running dev server, including from the machine's LAN IP).

### What's blocked, and what I need you to do

1. **Local dev database is stale** (`backend/prisma/migrations/
   20260915152325_opt_in_spaces` was edited in place, but the local Postgres
   still has the old table shapes). Prisma's own CLI **refused to run
   `migrate reset`**, printing a built-in guard against an AI agent running a
   destructive DB command without your explicit consent - I did not try to
   route around it. Run this yourself (see the full entry below for a
   less-destructive alternative):
   ```
   cd backend && pnpm exec prisma migrate reset --force
   ```
   Until this runs, nothing in this feature has been exercised against a
   real database - not `pnpm seed:space`, not a live sign-in/invite/pin
   round-trip, nothing. Everything above is verified at the build/lint/unit-
   test level only. **Please do a real end-to-end pass once the DB is
   reset** (seed a space, invite yourself as a visitor, accept, place a pin
   as the seeded participant, confirm the visitor sees it) before trusting
   this in front of real neighbors.
2. **The `.pmtiles` file** doesn't exist - no `go-pmtiles` CLI is installed
   in this environment, and `https://build.protomaps.com/builds.json`
   404s from here (the domain itself resolves and responds - see
   `scripts/build-tiles.sh`'s comment for exactly what that means and what
   to check). The map currently renders a real, working **placeholder**:
   the boundary outline on a plain background, self-hosted, zero network
   requests - not broken, just not the real basemap. Once you have a real
   `.pmtiles` file (run `scripts/build-tiles.sh`, fixing the builds.json URL
   first if needed) at `public/spaces/tiles/meckenhausen-v1.pmtiles`, the map
   will pick it up automatically (`SpaceMap.tsx` checks for it at runtime).
   **Glyphs (font PBFs) and a sprite sheet also need bundling** under
   `public/spaces/fonts/` and `public/spaces/sprite/` for label/icon layers
   to render - see the font-licensing entry below (Noto Sans, OFL-1.1) for
   what to grab and how to keep its license alongside it.
3. **192×192 / 512×512 / maskable PNG icons** aren't generated - no
   rasterizer (ImageMagick, `rsvg-convert`, or an existing npm dependency)
   was available. The SVG source is at `public/spaces/icon.svg` (already
   wired into the manifest as a working `sizes: "any"` icon, which many
   browsers accept directly) - rasterize it yourself (e.g. open it in a
   browser and export, or `npx sharp-cli`) to `icon-192.png`, `icon-512.png`,
   and `icon-maskable-512.png` in the same directory.
4. **`.env.example` lines**: reading/editing both `.env.example` files is
   blocked by a permission rule in this session (confirmed directly, not
   assumed). The exact lines to add by hand are in the two entries below
   titled "`.env.example` lines" - **please add these**, especially
   `VITE_PRIVACY_CONTROLLER_NAME`/`VITE_PRIVACY_CONTROLLER_CONTACT` (the
   privacy notice currently shows literal placeholder text until you do).
5. **Not verified in a real browser** at all - this session had no way to
   drive one. The CSP, the service worker, the map rendering, touch/mobile
   behavior, and screen-reader behavior are all written carefully against
   the relevant specs/APIs but **none of it has been visually or
   interactively checked**. Please actually open it - on desktop, on a
   phone (see `docs/DEV-HTTPS.md` for trusting the dev cert there), and
   ideally with a screen reader - before the event.
6. No new Playwright e2e specs were added for this feature (blocked on the
   same DB issue as above) - only backend/frontend unit tests exist.

### Everything else in TASK.md

Every remaining item (sections 1-10) is either implemented and covered
above, or called out as a specific decision/blocker in the dated entries
below - nothing was silently skipped. Read chronologically from here down if
you want the full reasoning behind any specific choice (roles, the boundary
bbox fallback, why vite-plugin-pwa was dropped in favor of a hand-rolled
service worker, the CSP relaxations, etc.).

## 2026-09-21 — New session: TASK.md verification finding (IMPORTANT)

New session starting on `feature/opt-in-signups`, instructed to carry out
`TASK.md` (the Meckenhausen Halloween map pivot) autonomously. TASK.md
section 0 explicitly says to verify the claimed prior-session state with
`git status`, `git diff`, and `pnpm build && pnpm test` rather than trust it
blindly. Doing that first, as instructed:

**The claimed backend-rewrite state does not exist in source.** `git status`
shows only `TASK.md` modified (the task file itself); nothing else is
uncommitted. `backend/prisma/schema.prisma` at HEAD still has the *original*
generic system — `Space` / `SpaceParticipant` (no `role` column) /
`OptInEvent` / `OptInEntry` with a JSON `fieldSchema` — not the
`SpaceLocation`-off-`Space`, `SpaceParticipant.role`, `requireSpaceRole`
design the two worklog entries below and TASK.md section 0 describe. There is
no `seed-space.ts` anywhere in `backend/src` or `backend/prisma`.

Corroborating evidence this work was actually done once and then lost rather
than never attempted: `backend/dist/` (gitignored, local-only build output)
still contains compiled `space-location.repository.js`,
`require-space-role.js`, etc. from **today, 22:21**, matching the design the
worklog entries below describe almost exactly. So a prior session built and
verified this design, but its source changes never made it into the current
`HEAD` (`a4b7f8f "Pre-Session Commit"`, the commit that added `TASK.md` and
these two worklog entries) — reflog/stash show nothing recoverable, so the
source is genuinely gone, not just uncommitted-but-present.

Treating the two worklog entries below as a **useful design reference**
(recovered informally by reading the leftover compiled `dist/*.js`, which is
close enough to read as pseudocode) rather than as ground truth, since the
actual source doesn't exist to inspect directly. Proceeding to actually build
this now, expanding well past that recovered sketch since TASK.md asks for
much more than the original plan covered (GDPR consent, invite expiry/rate
limits, boundary validation, MapLibre map, PWA, dev HTTPS, etc.).

Also noted section 2's "remove leader/member from schema, use-cases, routes,
UI, and tests" — the *directory* app's own `Role` enum (`member`/`leader` on
`Account`) is untouched by this task; that phrasing is the spec's own
shorthand for the Spaces feature's two-role split (`participant`/`visitor`),
which never had `leader`/`member` naming in the code that actually exists.
Nothing to remove there; noting it so it doesn't look skipped.

User sent a mid-task note: the Postgres container is already running; do not
run `docker compose down`/volume/prune commands; only bring up a specific db
service with `docker compose up -d <service>` if unreachable, and log it.
Noted, will follow.

Meckenhausen boundary lookup (section 4, one-time dev-time script, per the
task's own instructions): Nominatim (`nominatim.openstreetmap.org`) is
reachable and returns exactly one result for "Meckenhausen, Hilpoltstein,
Bavaria, Germany" — `osm_type: node` (a point, `place=village`), not a
way/relation, so **no polygon exists for this Ortsteil in OSM**, confirming
the task's own anticipated fallback applies. Overpass
(`overpass-api.de/api/interpreter`) is reachable but returns `406 Not
Acceptable` on every query shape tried (default UA, browser UA, GET/POST) —
logging as a minor blocker, not worth more time on since Nominatim already
answered the only question that mattered (no polygon exists). Using
Nominatim's returned bounding box `[49.1518269, 49.1918269, 11.2690778,
11.3090778]` (south, north, west, east) as the committed boundary, per
section 4's explicit "if no polygon exists, use a bbox and log it."

Plan for the rest of this session, in the order TASK.md specifies: backend
schema/use-cases/validation/security/purge+erase scripts/tests, then
frontend (map, pin placement, forms, invites, delete flow), then PWA/service
worker/IndexedDB, then dev HTTPS, then privacy notice + TEARDOWN.md +
DEV-HTTPS.md. Given the true size of this (a from-scratch self-hosted
MapLibre PWA with offline caching, GDPR-compliant invite system, and
hand-rolled boundary validation on both tiers), logging blockers and moving
on per the task's own instructions where something is genuinely
out-of-reach in this session (no `go-pmtiles`/`pmtiles` CLI installed,
confirmed via `which`, so the tile pipeline is blocked at the "no CLI or
network" case section 4 already anticipates — building against the
placeholder style as instructed).

## 2026-09-21 — `.env.example` lines (permission-blocked, section 10)

Reading/editing `backend/.env.example` (and presumably the root `.env.example`)
is blocked by a permission rule in this session - confirmed by trying to
`Read` it directly, not just inferred from the recovered worklog entry below.
Per TASK.md section 10 ("do NOT work around it: write the exact lines to
docs/WORKLOG.md for me"), here's what to add by hand. Backend
(`backend/.env.example`, alongside the existing `SPACE_JWT_SECRET`):

```
# Space invites (docs/WORKLOG.md, 2026-09-21 pivot) - all optional, shown with
# their defaults from backend/src/composition-root.ts.
SPACE_INVITE_TTL_MS=604800000            # 7 days
SPACE_INVITE_RATE_LIMIT_WINDOW_MS=3600000 # 1 hour
SPACE_INVITE_RATE_LIMIT_MAX=10
SPACE_INVITE_MAX_PER_PARTICIPANT=50

# When the Meckenhausen map's data is purged and the API starts returning 410
# for it - midnight after Halloween, Europe/Berlin.
EVENT_END_AT=2026-11-01T00:00:00+01:00

# Seeding the first participant (pnpm seed:space) - see backend/prisma/seed-space.ts.
SEED_SPACE_SLUG=meckenhausen
SEED_SPACE_NAME=Meckenhausen Halloween
SEED_SPACE_PARTICIPANT_EMAIL=
```

Frontend (root `.env.example`, alongside the existing `VITE_API_URL`):

```
# Halloween map (docs/WORKLOG.md, 2026-09-21 pivot).
VITE_SPACE_SLUG=meckenhausen

# Privacy notice controller info (TASK.md section 3) - placeholders, fill in
# for real before this is ever deployed.
VITE_PRIVACY_CONTROLLER_NAME=
VITE_PRIVACY_CONTROLLER_CONTACT=

# Must match the backend's EVENT_END_AT exactly (see backend/.env.example
# lines above) - this one only controls what date the privacy notice page
# displays, it doesn't gate anything itself.
VITE_EVENT_END_AT=2026-11-01T00:00:00+01:00

# How often the IndexedDB location cache revalidates against the API on its
# own (independent of the "once per session on load" revalidation - see
# frontend/infrastructure/space-cache/location-cache.ts).
VITE_LOCATION_CACHE_TTL_HOURS=24
```

## 2026-09-21 — Font licensing note, and a couple of already-satisfied items

TASK.md section 4: "Check font licenses and note them" - for when the real
glyphs get bundled (still blocked, see the entry above): Protomaps'
`@protomaps/basemaps` style layers (frontend/infrastructure/tile-server/
space-map-style.ts) are designed around **Noto Sans**, licensed under the
SIL Open Font License 1.1 - permissive, allows bundling/redistribution
(including in a project like this one) and modification, only restricts
selling the font *by itself* and requires keeping the license notice with
it. Whoever generates the glyph PBFs (e.g. via `protomaps/basemaps`' own
font-build tooling, or `node-fontnik`) should pull Noto Sans specifically
and keep its `OFL.txt` alongside the bundled `.pbf` files under
`public/spaces/fonts/`, per the OFL's own redistribution requirement.

Two section 8 items that turned out to already be satisfied rather than
needing new code, worth recording so they don't look skipped:
- "Request body size limits": `express.json()` (backend/src/ports/http/app.ts)
  defaults to a 100kb body limit - already a real, enforced bound, not an
  unlimited default. Left as-is rather than adding a redundant explicit
  value.
- The "sign-up form" fairness-messaging placement (section 3) - added to
  `LocationForm.tsx` (the pin form) from the start; also added to
  `InviteAcceptPage.tsx` (the actual account-creation/consent screen) on a
  re-read, since "sign-up form" more literally means that page. Both now
  show it, alongside the delete-confirmation dialog.

## 2026-09-21 — Backend rewrite: schema, use-cases, routes (blocked on DB reset)

Rewrote the backend for real this time (previous entries below described this
but the source didn't exist - see the verification finding above). Done:

- `prisma/schema.prisma` + the (in-place-edited) `20260915152325_opt_in_spaces`
  migration: dropped `OptInEvent`/`OptInEntry`/`FieldDef`, added `SpaceRole`
  enum (`participant`/`visitor`), `SpaceParticipant.role`/`consentAt`/
  `noticeVersion`, `SpaceLocation` (one per participant, unique on
  `participantId`), `SpaceInvite` (tokenHash, expiry, revocation, inviter).
  Editing the migration in place rather than adding a new one, since it has
  never shipped anywhere but this unmerged branch (TASK.md section 2 permits
  this explicitly).
- `domain/space/`: `space.types.ts` rewritten; new `meckenhausen-boundary.ts`
  (the committed Nominatim bbox, see the finding above),
  `point-in-polygon.ts` (hand-rolled ray-casting, no new dependency),
  `text-sanitize.ts` (NFC normalize + control-character rejection for
  label/note, coordinate rounding to 5 decimals). Deleted `sort-entries.ts`
  (nothing left to sort a list of FieldDef answers by).
- `application/space/`: rewrote `space.repository.ts` interfaces and
  `space.use-cases.ts` (sign-in-only `requestSpaceMagicLink` with
  anti-enumeration, `inviteParticipant`/`revokeInvite`/`acceptInvite`,
  `addLocation`/`updateLocation`/`deleteLocation`, `removeMe`). Deleted
  `entry.repository.ts`/`event.repository.ts`.
- `infrastructure/prisma/`: rewrote `space.repository.ts` (added
  `deleteCascade`, one transaction), `space-magic-link-token.repository.ts`;
  new `space-location.repository.ts`, `space-invite.repository.ts`. Deleted
  the old entry/event Prisma repos.
- `ports/http/`: `require-space-role.ts` (new, mirrors `require-role.ts`),
  `require-event-active.ts` (new, the `EVENT_END_AT` → 410 gate from section
  3), `require-space-auth.ts` updated to carry `role` in the session, rewrote
  `space.schemas.ts` and `space.routes.ts` for the new invite/location
  endpoints, added `spaceInviteRateLimiter`/`spaceInviteAcceptRateLimiter` to
  `rate-limit.ts`.
- `composition-root.ts`: wired everything, with `SPACE_INVITE_TTL_MS` (default
  7 days), `SPACE_INVITE_RATE_LIMIT_WINDOW_MS`/`_MAX` (default 1h / 10),
  `SPACE_INVITE_MAX_PER_PARTICIPANT` (default 50), `EVENT_END_AT` (default
  `2026-11-01T00:00:00+01:00`) all env-configurable with defaults, matching
  section 2/3's "configurable" requirements.
- `prisma/seed-space.ts` (+ `pnpm seed:space`), `prisma/purge-space.ts`
  (+ `pnpm purge:space`, dry-run unless `--yes`), `prisma/erase-participant.ts`
  (+ `pnpm erase:participant -- --email ...`, CLI-only, never routed over
  HTTP) - section 3's operator tooling.
- `pnpm build` (tsc) is clean after regenerating the Prisma client
  (`pnpm prisma:generate` - the client was stale against the rewritten
  schema, same gotcha the recovered worklog entry below hit).

**Blocked, needs the user's explicit go-ahead**: the local dev Postgres
(already running, per the user's mid-task note) still has the *old* table
shapes (`OptInEvent`/`OptInEntry`, `SpaceParticipant` without `role`) even
though `_prisma_migrations` already marks `20260915152325_opt_in_spaces` as
applied - some earlier process applied the old version of that migration
directly to this DB without every column present in the file as it now
reads. `prisma migrate deploy` reports "up to date" (it isn't actually
re-diffing, just trusting the recorded migration name), so the fix is
`prisma migrate reset` (or an equivalent manual reconciliation). I ran it and
Prisma's own CLI **refused**, printing a built-in guard: it detected an AI
agent invoking a destructive command and requires the user's *explicit,
literal* consent via `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` before it
will proceed, and states this must not happen on a production database.

This is local dev/prototype data behind a docker-compose Postgres exposed on
`localhost:5432` (not the Hetzner prod database - no prod credentials or
connection are configured on this machine), so resetting it is very likely
safe, but I'm not going to override a safety mechanism that exists
specifically to stop an agent from doing this unattended - that's exactly
the kind of destructive action this session's own instructions say to get
confirmation for rather than route around. **To unblock: run one of these
yourself** (from `backend/`, with the dev stack up):

```
pnpm exec prisma migrate reset --force
```

or, more surgically (keeps the `Member`/`Organization`/`Account` directory
data untouched, only touches the Space feature's own tables):

```
docker exec -e PGPASSWORD=app visual-directory-db psql -U app -d contact_book -c \
  'DROP TABLE "OptInEntry", "OptInEvent", "SpaceMagicLinkToken", "SpaceParticipant", "Space" CASCADE;'
pnpm exec prisma migrate resolve --rolled-back 20260915152325_opt_in_spaces
pnpm exec prisma migrate deploy
```

Everything else in this session that doesn't need a live matching database
(unit tests against fake in-memory repositories, `pnpm build`, the frontend)
proceeds normally in the meantime.

## 2026-09-21 — Rework Spaces into the Halloween map sign-up

Plan approved (saved separately as the session's plan file): drop the generic
Space/Event/Entry dynamic-field-schema system in favor of a fixed-shape,
invite-only, map-pin-based sign-up (`Space` → `SpaceLocation`, two roles
`location`/`visitor`), matching the reference prototype
`frontend/trick-or-treat-signup.html`. Full rationale in the plan.

Starting with the backend: Prisma schema + migration rewrite (confirmed with
the user that migration `20260915152325_opt_in_spaces` has never been applied
anywhere, so rewriting it in place is safe), then domain/application/ports,
then the frontend, then the manifest.

## 2026-09-21 — Backend rewrite complete

Finished the backend half of the plan: schema/migration rewrite
(`OptInEvent`/`OptInEntry` → `SpaceLocation` directly off `Space`,
`SpaceParticipant.role`), domain types, `space.use-cases.ts` (invite-only
`requestSpaceMagicLink` matching `auth.use-cases.ts`'s anti-enumeration
behavior, new `inviteSpaceParticipant`/`addLocation`/`updateLocation`/
`deleteLocation`), repository interfaces + Prisma implementations, the new
`requireSpaceRole` middleware, rewritten validation schemas and routes, and
`backend/prisma/seed-space.ts` (+ `pnpm seed:space`) replacing the public
self-serve "create a space" page as the bootstrap path.

Gated `POST/PATCH/DELETE /:slug/locations*` behind `requireSpaceRole("location")`
in addition to `requireSpaceAuth` — the plan had left this open ("re-check...
if this reads wrong once built"), but the user was explicit that visitors get
read-only access, so a `visitor`-role session must not be able to write a pin
at the API level (the frontend hiding the button isn't the security boundary,
per this repo's own convention).

Ran `pnpm prisma:generate` (client was stale against the rewritten schema —
that's what the first `pnpm build` errors were), then `pnpm build` (clean) and
`pnpm test` (4 passed — pre-existing `canonical-json.test.ts` only, no new
tests added yet for the invite-only/ownership logic, still pending).

Blocked: `backend/.env.example` and root `.env.example` are outside my
permitted file access this session, so `SEED_SPACE_SLUG`/`SEED_SPACE_NAME`/
`SEED_LOCATION_EMAIL` aren't documented there yet — needs a manual add.

Next: frontend — delete the dynamic-field-era pages, add the locations cache
and map-picker components, then the PWA manifest.
