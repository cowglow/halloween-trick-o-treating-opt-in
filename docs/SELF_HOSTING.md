# Running the map for your community

How to run the Halloween map for your own village, town or neighborhood:
from a fork of this repository to a live map, and its automatic end after
the event. It takes an afternoon if you've used a server with Docker before.

The pieces:

- **The map app**: a static site (React). This guide hosts it on GitHub
  Pages, on its own domain; any static host works.
- **The API**: a Node service with a Postgres database, behind Caddy (which
  gets the HTTPS certificate). All three run with Docker Compose on one
  small server.
- **Email**: sign-in links, invites and the thank-you go out through
  [Resend](https://resend.com).

## What you need

- A small Linux server with Docker and the Compose plugin: 2 GB of memory
  is plenty. We used a Hetzner Cloud server in 2026; `docs/HETZNER_DEPLOY.md`
  shows how we set it up (with a firewall and an SSH-only login), if you
  want to do the same. Any provider works.
- A domain where you can add two names: one for the map
  (`halloween.example.org`) and one for the API
  (`halloween-api.example.org`).
- A Resend account with a verified sending domain:
  `docs/RESEND_EMAIL_SETUP.md`.
- A GitHub account, for your fork and its Pages site.

## 1. Fork it and describe your community

1. Fork this repository.
2. Edit `community/community.json`: your community's name, a slug, who
   signs the thank-you, your hosting provider, time zone, when the event
   ends, the default email language, and the map's center and boundary.
   `community/README.md` explains every field.
3. Cut the map for your area: set `map.tiles` to a new file name and run
   `scripts/build-tiles.sh` (it needs the `pmtiles` CLI).
4. Render your WhatsApp images with your map's address:
   `pnpm images:whatsapp -- --url halloween.example.org`.
5. Read the privacy notice (`spacePrivacy` in
   `frontend/ports/i18n/translations/`, in all three languages) and make
   sure it says how you run the map. You are the controller it names.
6. Try it locally: `pnpm install`, `cd backend && pnpm install && pnpm
   prisma:generate`, then `pnpm dev:up` from the repo root
   (`docs/DEV-HTTPS.md` explains the HTTPS dev server).

Commit and push to your fork.

## 2. Start the API on your server

On the server, as a user that can run Docker:

```bash
sudo mkdir -p /opt/halloween-map && sudo chown "$USER" /opt/halloween-map
git clone https://github.com/YOU/YOUR-FORK.git /opt/halloween-map
cd /opt/halloween-map
cp deploy/env.example .env && chmod 600 .env
nano .env    # every value; see the comments
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api pnpm prisma:deploy
```

Point the API's name (`halloween-api.example.org`) at the server's IP
address (an A record, and AAAA for IPv6). Caddy fetches the certificate on
its own once the name resolves; then
`curl https://halloween-api.example.org/health` answers `{"ok":true}`.

Add yourself as the first participant (you'll invite everyone else from
the app):

```bash
docker compose -f docker-compose.prod.yml exec -e SEED_SPACE_PARTICIPANT_EMAIL=you@example.org api pnpm seed:space
```

## 3. Publish the map app

In your fork's settings on GitHub:

1. **Settings → Secrets and variables → Actions → Variables**: add
   - `MAP_API_URL`: `https://halloween-api.example.org`
   - `MAP_DOMAIN`: `halloween.example.org`
   - `PRIVACY_CONTROLLER_NAME` and `PRIVACY_CONTROLLER_CONTACT`: your name
     and an address people can write to about their data.
2. **Settings → Pages**: deploy from the `gh-pages` branch.
3. Point the map's name (`halloween.example.org`) at GitHub Pages: a CNAME
   record to `YOU.github.io`. Then tick "Enforce HTTPS" in the Pages
   settings once it's offered.

Every push to `main` runs the tests, and when they pass, publishes the app
(`.github/workflows/deploy.yml`). Without `MAP_API_URL` the workflow
publishes this project's documentation site instead.

Open `https://halloween.example.org`, ask for a sign-in link with your
email, and put your house on the map.

## 4. Before and during the event

- Invite the first neighbors from the app (**Invite neighbors**). Anyone
  else can ask to join, and any participant can let them in.
- Share the WhatsApp images (menu → **Let your neighbors know**).
- `docs/CHECK_SIGNUPS.md` shows how to look into a sign-up that seems stuck,
  read-only.
- To update the API after a change: `git pull`, then the `up -d --build` and
  `prisma:deploy` commands from step 2.

## 5. The end of the event

Install the two cron jobs on the server, once, any time before the event
ends:

```bash
cd /opt/halloween-map && crontab deploy/crontab.example
```

- `deploy/thank-you.sh` runs every 5 minutes and does nothing until 15
  minutes before the event end. Then it sends everyone the thank-you email,
  in their language; the next runs pick up anyone who joined since and
  retry failures. Nobody gets it twice.
- `deploy/teardown.sh` runs every minute and does nothing until a minute
  after the event end. Then it deletes all the space's data, stops the
  containers and deletes their volumes, deletes `.env`, and removes both
  cron jobs.

Both write counts to `thank-you.log` and `teardown.log` in
`/opt/halloween-map`, never addresses. The map app shows "Thank you!" and
that the map has closed from the moment the event ends, without a deploy.

Afterwards, by hand:

1. Read the logs, if you want the numbers.
2. Delete the server at your provider.
3. Delete the API's DNS record. A name that points at an address your
   provider gives to someone else later would lead to their server.
4. Keep the map's name for next year, or delete it and the `MAP_*`
   variables.

`docs/TEARDOWN.md` has the details we followed in 2026, including what to
do by hand if the automatic teardown fails.
