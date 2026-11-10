# Deploying the backend to Hetzner

> **How we set up the server for the 2026 Meckenhausen map.** For running
> the map yourself, start with [`SELF_HOSTING.md`](./SELF_HOSTING.md); this
> guide is one way to do its "What you need" on Hetzner Cloud (the server,
> firewall and SSH-only login). The GitHub Actions job that deployed the API
> here was removed with the server after the event: the API is now built on
> the server from a checkout (`SELF_HOSTING.md`, step 2), so the "Automated
> deploys" section below is history.

The one-time setup for running the API (`db` + `api` + `caddy`) on a Hetzner Cloud
VPS. The frontend is a static site on GitHub Pages. After this setup, deploys run
from `.github/workflows/deploy.yml` (see [Automated deploys](#automated-deploys)).

> **This guide assumes a new server of its own.** Sharing the visual directory's
> server would clash on Caddy (ports 80/443) and needs one Caddy for both sites;
> that isn't written up. See the open decisions in `TASK.md`.
>
> **Rebuilding after you deleted the server?** Use
> [`HETZNER_REBUILD.md`](./HETZNER_REBUILD.md), the short version of this guide.

Throughout, `$API_DOMAIN` is the API's host name, `$SUBDOMAIN.$DOMAIN` (e.g.
`halloween-api.cowglow.io`), and `YOUR_SERVER_IP` is the server's public IP.

## 0. What you need first

- A Hetzner Cloud project and the [`hcloud` CLI](https://github.com/hetznercloud/cli)
  pointed at it: `hcloud context create halloween-map` (asks for an API token from
  **Console → Security → API Tokens**).
- `jq` (`brew install jq`), used by `scripts/ionos-dns-upsert.sh`.
- DNS for `$DOMAIN` at IONOS, with an **API key** (IONOS hosting console → **API
  Keys**) so step 2 can set the A record without the web panel.
- `deploy/hetzner/config.env`, copied from
  [`config.env.example`](../deploy/hetzner/config.env.example) with real values.
  Every command below assumes you ran this first:

  ```bash
  set -a; source deploy/hetzner/config.env; set +a
  export API_DOMAIN="$SUBDOMAIN.$DOMAIN"
  ```

  Keep `IONOS_API_KEY` out of that file; export it in your
  shell.
- Two SSH key pairs in `cert/` (gitignored):
  - `cert/id_hetzner`: the CI deploy key. **No passphrase**: GitHub Actions can't
    unlock one, and a passphrase is the most common way this setup breaks.

    ```bash
    mkdir -p cert
    ssh-keygen -t ed25519 -C "github-actions-deploy" -f cert/id_hetzner -N ""
    ```

  - `cert/id_hetzner_admin`: your own key for manual access, **with** a
    passphrase, so you never use the CI key by hand. See
    [`SSH_KEY_SETUP.md`](./SSH_KEY_SETUP.md).

## 1. Provision the server

**Add the SSH keys to Hetzner before creating the server.** Hetzner only puts
a project's keys on a server when it is created; adding one later does nothing.

Render the cloud-init file (it creates the `deploy` user with both keys,
installs Docker and creates `/opt/halloween-map`):

```bash
sed -e "s#\${CI_PUBLIC_KEY}#$(cat cert/id_hetzner.pub)#" \
    -e "s#\${ADMIN_PUBLIC_KEY}#$(cat cert/id_hetzner_admin.pub)#" \
    deploy/hetzner/user-data.yml.tmpl > deploy/hetzner/user-data.yml
```

Then register the keys and firewall (both scripts reuse existing ones) and create
the server:

```bash
CI_KEY_NAME=$(scripts/hcloud-ensure-ssh-key.sh github-actions-deploy cert/id_hetzner.pub)
ADMIN_KEY_NAME=$(scripts/hcloud-ensure-ssh-key.sh admin cert/id_hetzner_admin.pub)

scripts/hcloud-ensure-firewall.sh halloween-map <(cat <<'EOF'
[
  {"direction": "in", "protocol": "tcp", "port": "22", "source_ips": ["0.0.0.0/0", "::/0"]},
  {"direction": "in", "protocol": "tcp", "port": "80", "source_ips": ["0.0.0.0/0", "::/0"]},
  {"direction": "in", "protocol": "tcp", "port": "443", "source_ips": ["0.0.0.0/0", "::/0"]}
]
EOF
)

hcloud server create --name halloween-map \
  --image "$HETZNER_IMAGE" \
  --type "$HETZNER_SERVER_TYPE" \
  --location "$HETZNER_LOCATION" \
  --ssh-key "$CI_KEY_NAME" --ssh-key "$ADMIN_KEY_NAME" \
  --firewall halloween-map \
  --user-data-from-file deploy/hetzner/user-data.yml
```

`hcloud server create` fails if a server named `halloween-map` already exists,
on purpose. Narrow port 22 to your own IP if it is stable. Never open `4000`
(API), `5432` (Postgres) or `8081` (Adminer).

The IP is in the output (or `hcloud server ip halloween-map`). Cloud-init needs a
minute or two; wait for it:

```bash
until ssh -i cert/id_hetzner -o StrictHostKeyChecking=accept-new deploy@YOUR_SERVER_IP docker --version; do sleep 5; done
```

If it never succeeds: `ssh -i cert/id_hetzner_admin root@YOUR_SERVER_IP 'cat /var/log/cloud-init-output.log'`.
Once `deploy` works, consider [`HETZNER_ROOT_LOCKDOWN.md`](./HETZNER_ROOT_LOCKDOWN.md).

## 2. Point DNS at it

```bash
IONOS_API_KEY=... SERVER_IP=YOUR_SERVER_IP scripts/ionos-dns-upsert.sh
dig +short "$API_DOMAIN" @1.1.1.1   # prints YOUR_SERVER_IP once propagated
```

The script only ever creates or updates the one `$SUBDOMAIN` A record. Caddy
can't get its certificate until this resolves, so wait for it.

## 3. Set the GitHub variables and secrets

The deploy job builds the API image, pushes it to `ghcr.io`, copies
`docker-compose.prod.yml` and `Caddyfile` to `/opt/halloween-map/`, and writes
`.env` there from these values. The server never needs the repo.

```bash
gh variable set API_DOMAIN --repo "$GITHUB_REPO" --body "$API_DOMAIN"
gh variable set PRIVACY_CONTROLLER_NAME --repo "$GITHUB_REPO" --body "Your name"
gh variable set PRIVACY_CONTROLLER_CONTACT --repo "$GITHUB_REPO" --body "you@example.com"
# Optional; the backend defaults to 2026-11-01T00:00:00+01:00:
# gh variable set EVENT_END_AT --repo "$GITHUB_REPO" --body "2026-11-01T00:00:00+01:00"

gh secret set HETZNER_HOST --repo "$GITHUB_REPO" --body "YOUR_SERVER_IP"
gh secret set HETZNER_USER --repo "$GITHUB_REPO" --body "deploy"
gh secret set HETZNER_SSH_KEY --repo "$GITHUB_REPO" < cert/id_hetzner

gh secret set POSTGRES_USER --repo "$GITHUB_REPO" --body "app"
gh secret set POSTGRES_PASSWORD --repo "$GITHUB_REPO" --body "$(openssl rand -hex 24)"
gh secret set POSTGRES_DB --repo "$GITHUB_REPO" --body "halloween_map"
gh secret set SPACE_JWT_SECRET --repo "$GITHUB_REPO" --body "$(openssl rand -hex 32)"
gh secret set CLIENT_ORIGIN --repo "$GITHUB_REPO" --body "$CLIENT_ORIGIN"
```

| Name | Kind | What it is |
|---|---|---|
| `API_DOMAIN` | variable | The API host name. Feeds `VITE_API_URL`, Caddy's site address and the status badge. Both deploy jobs fail early without it. |
| `PRIVACY_CONTROLLER_NAME` / `PRIVACY_CONTROLLER_CONTACT` | variables | Who is responsible for the data, shown on the privacy notice. Built into the site; the client job refuses to publish without them. |
| `EVENT_END_AT` | variable, optional | ISO 8601 end of the event; after it the API answers 410. |
| `HETZNER_HOST` / `HETZNER_USER` / `HETZNER_SSH_KEY` | secrets | How CI reaches the server: IP, `deploy`, the private `cert/id_hetzner`. Update all three together if the server or key changes. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | secrets | The production database. Don't reuse the dev defaults. |
| `SPACE_JWT_SECRET` | secret | Signs participant sessions. |
| `CLIENT_ORIGIN` | secret | The frontend's exact origin, scheme and host, no path: `https://halloween.cowglow.io`. It is the CORS allowlist and the base of emailed links. |
| `RESEND_API_KEY` / `EMAIL_FROM` | secrets, optional | Real email delivery, see [`RESEND_EMAIL_SETUP.md`](./RESEND_EMAIL_SETUP.md). Unset, sign-in and invite links are only written to the API log. |

## 4. Enable GitHub Pages on its own domain

The site is served from the root of `halloween.cowglow.io` (`public/CNAME`,
`base: "/"`), not from `cowglow.github.io/<repo>/`. That keeps its storage
(the session token) apart from every other Pages site on `cowglow.github.io`.

1. DNS at IONOS: `halloween` as a **CNAME** to `cowglow.github.io` (no A or
   AAAA records for that name).
2. **Settings → Pages → Build and deployment → Deploy from a branch**, branch
   `gh-pages`, folder `/`; **Custom domain** `halloween.cowglow.io`. Or:

   ```bash
   gh api -X PUT repos/$GITHUB_REPO/pages -f cname=halloween.cowglow.io -f "source[branch]=gh-pages" -f "source[path]=/"
   ```

3. Once GitHub has issued the certificate (minutes), tick **Enforce HTTPS**
   (`gh api -X PUT repos/$GITHUB_REPO/pages -F https_enforced=true`).

Every deploy republishes `public/CNAME`, so the custom domain survives the
branch being replaced.

## 5. Deploy

```bash
gh workflow run deploy.yml --repo "$GITHUB_REPO"
gh run watch --repo "$GITHUB_REPO"
```

`deploy_server` builds and pushes the image, starts `db`, `api` and `caddy`, and
runs `pnpm prisma:deploy` (on a fresh database that applies the single `init`
migration). Caddy gets its Let's Encrypt certificate on first start.
`deploy_client` then builds the frontend with `VITE_API_URL=https://$API_DOMAIN`
and publishes it to `gh-pages`.

After this first run, deploys are automatic: `deploy.yml` runs whenever the
Tests workflow passes on `main`.

## 6. Check it

```bash
curl "https://$API_DOMAIN/health"
# {"ok":true}
```

A TLS error almost always means DNS (step 2) isn't resolving yet. Fix it, then
`docker compose -f docker-compose.prod.yml restart caddy` on the server. Then
work through [`VALIDATE_PRODUCTION.md`](./VALIDATE_PRODUCTION.md).

## 7. Seed the space and the first participant (once)

Deploys run migrations but never the seed. Until you seed, nobody can sign in:

```bash
ssh -i cert/id_hetzner_admin deploy@YOUR_SERVER_IP \
  "cd /opt/halloween-map && docker compose -f docker-compose.prod.yml exec -T \
   -e SEED_SPACE_PARTICIPANT_EMAIL=$SEED_SPACE_PARTICIPANT_EMAIL api pnpm seed:space"
```

That participant then invites everyone else from the app.

## Automated deploys

`.github/workflows/deploy.yml` runs after the Tests workflow passes on a push
to `main`, on exactly the tested commit (a red build never deploys), or by hand
with `gh workflow run deploy.yml`:

1. `deploy_server` builds `backend/Dockerfile`, pushes
   `ghcr.io/cowglow/halloween-map-api:latest`, copies `docker-compose.prod.yml` and
   `Caddyfile` to `/opt/halloween-map/`, writes `.env` (mode `600`), pulls, runs
   `docker compose up -d` and `pnpm prisma:deploy`.
2. `deploy_client` builds the site and publishes `dist/` to `gh-pages`, keeping
   `test.yml`'s `test-report/` folder.

`backend-up.yml` / `backend-down.yml` started and stopped `api` and `caddy` by hand; they were removed with the server after the 2026 event.

## Operations

All on the server, in `/opt/halloween-map`, with `docker compose -f docker-compose.prod.yml`:

- **Logs**: `... logs -f api` (or `db`, `caddy`). Caddy's access log keeps 7 days
  (`Caddyfile`); container logs are capped by `x-logging` in the compose file.
- **Migrations**: run on every deploy; by hand: `... exec api pnpm prisma:deploy`.
- **Checking on sign-ups** (is a request waiting, was the invite used?): `docs/CHECK_SIGNUPS.md`.
- **Erasing one person on request**: `... exec api pnpm erase:participant -- --email person@example.com`.
- **The thank-you email (31 October, before `EVENT_END_AT`)**: `... exec api pnpm thank:space -- --slug meckenhausen`
  prints how many people get it, per language; add `--reply-to you@example.com --yes` to send.
  Running it again only retries failed sends. It refuses to send after `EVENT_END_AT`, and
  `purge:space --yes` refuses to delete while anyone hasn't been thanked (`--without-thanks` overrides).
- **Looking at the data**: `... exec db psql -U "$POSTGRES_USER" "$POSTGRES_DB"`
  over SSH. The production stack has no Adminer, and no database port is open.
- **Backups**: none, on purpose. The data must be gone after the event, and a
  backup would outlive it.

## After the event

At `EVENT_END_AT` the API stops serving pins (410); "Remove me" keeps working.
The data itself is still in Postgres until you delete it:

```bash
cd /opt/halloween-map
docker compose -f docker-compose.prod.yml exec api pnpm purge:space -- --slug meckenhausen --yes
docker compose -f docker-compose.prod.yml down --volumes   # deletes postgres-data for good
```

Then tear the server down ([`TEARDOWN.md`](./TEARDOWN.md)).
