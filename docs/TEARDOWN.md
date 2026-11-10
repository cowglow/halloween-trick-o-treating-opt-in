# Tearing down after the event

The runbook for deleting everything once the event is over. The spec promises
that all data is gone after `EVENT_END_AT`. The API stops serving it at that
moment (410), but the rows stay in Postgres until they're purged.

**The thank-you email and step 1 run by themselves** (cron, installed by every
deploy in 2026; now `deploy/crontab.example`, see `docs/SELF_HOSTING.md`, and `deploy/teardown.sh`). One minute after
`EVENT_END_AT` (00:01 on 1 November) the server purges the data, stops the
containers, deletes their volumes and `.env`, and removes its own crontab
lines. Deleting the server (step 2) and the rest stay manual. Before you
delete it, read the log for the numbers (counts only, no addresses):

```bash
ssh -i cert/id_hetzner_admin deploy@YOUR_SERVER_IP 'cat /opt/halloween-map/thank-you.log /opt/halloween-map/teardown.log; docker ps -a; crontab -l'
```

Don't push to `main` after midnight: the deploy would start the containers
and write `.env` again (with an empty database, but still).

Run them from a machine with `hcloud`, `ssh` and this repo, after
`set -a; source deploy/hetzner/config.env; set +a`.

## Before: the thank-you email, on 31 October

Everyone on the map gets one thank-you email, which the privacy notice
promises before the deletion. It can't go out afterwards: the addresses are
gone.

**It's scheduled.** Every deploy installs a crontab line for the `deploy`
user (marked `# halloween-thank-you`) that runs `thank:space --yes
--within-minutes 15` every 5 minutes on 31 October. The script only sends in
the last 15 minutes before `EVENT_END_AT`, so the email goes out at 23:45
Meckenhausen time; the 23:50 and 23:55 runs send to anyone who joined since
and retry failures. Don't purge before midnight: `purge:space` refuses
anyway while someone hasn't been thanked. Replies go to `THANK_YOU_REPLY_TO` (the `PRIVACY_CONTROLLER_CONTACT`
repository variable). To check it on the evening:

```bash
crontab -l                    # the halloween-thank-you line
cat /opt/halloween-map/thank-you.log   # a timestamp and counts per run from 23:45
```

To send it by hand instead (or earlier), on the server (`/opt/halloween-map`):

```bash
docker compose -f docker-compose.prod.yml exec api pnpm thank:space -- --slug meckenhausen          # dry run: prints counts
docker compose -f docker-compose.prod.yml exec api pnpm thank:space -- --slug meckenhausen --reply-to you@example.com --yes
```

If it reports failures, run the second command again; nobody gets it twice.
`purge:space --yes` (step 1) refuses to delete anything while someone hasn't
been thanked, so the server can't go down before the email has gone out. If
an address keeps failing (a typo, a full mailbox), add `--without-thanks` to
purge anyway.

## 0. Check that nothing else lives on the server

This guide assumes the server runs only this app (see `HETZNER_DEPLOY.md`). If
it was shared with another app, stop after step 1 and don't delete the server.

```bash
ssh -i cert/id_hetzner_admin deploy@YOUR_SERVER_IP 'docker ps -a; crontab -l'
```

Only `halloween-map-db`, `halloween-map-api` and `halloween-map-caddy` should be
there, and the one crontab line, `# halloween-thank-you`. Remove that with:

```bash
ssh -i cert/id_hetzner_admin deploy@YOUR_SERVER_IP "crontab -l | grep -v '# halloween-thank-you' | crontab -"
```

## 1. Purge the data, then the volumes

Automatic (`deploy/teardown.sh`, 00:01). If `teardown.log` doesn't end
with "Torn down", do it by hand:

```bash
ssh -i cert/id_hetzner_admin deploy@YOUR_SERVER_IP
cd /opt/halloween-map
docker compose -f docker-compose.prod.yml exec api pnpm purge:space -- --slug meckenhausen          # dry run: prints counts
docker compose -f docker-compose.prod.yml exec api pnpm purge:space -- --slug meckenhausen --yes
docker compose -f docker-compose.prod.yml down --volumes    # deletes postgres-data and caddy-data
rm .env                                                     # the database password and API keys
exit
```

There are no backups to delete: none are made, on purpose (`HETZNER_DEPLOY.md`,
Operations). If anyone ever ran a manual `pg_dump`, find and delete it.

## 2. Delete the server and firewall

```bash
hcloud server delete halloween-map
hcloud firewall delete halloween-map
```

## 3. DNS and email

- Delete the `$SUBDOMAIN.$DOMAIN` A record at IONOS (**Domains & SSL → DNS**).
- The Resend API key is shared with the visual directory: only delete it if
  that app no longer sends mail (or gets its own key first). Keep the
  `mail.cowglow.io` records for the same reason.

## 4. GitHub

- Delete the secrets and variables, or at least the ones that grant access:
  `HETZNER_SSH_KEY`, `RESEND_API_KEY`, `SPACE_JWT_SECRET`.
- Delete the `halloween-map-api` package on ghcr.io (**Your profile → Packages**).
  It contains code only, no data, so this is tidying, not privacy.
- Decide what the site should say. The deployed frontend keeps working and shows
  "This map has ended" while the API answers 410. Once the API is gone it shows a
  connection error instead. To replace it with a static notice, or remove it, push
  a new build to `gh-pages` or turn off GitHub Pages.

## 5. Local copies

- Your local dev database only holds test data, unless you ever loaded real
  participants into it. If you did: `pnpm backend:down` and
  `docker volume rm halloween-map_postgres-data`.
- Remove any phone test installs (the installed PWA keeps its cached tiles and
  pins until it's removed or someone signs out).
