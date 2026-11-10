# Rebuilding the backend server

You deleted the Hetzner server and want the API back before the event is over.
This is the ordered checklist; [`HETZNER_DEPLOY.md`](./HETZNER_DEPLOY.md) explains
each step.

The frontend (GitHub Pages) is unaffected. The database went with the server, so
**every participant and pin is gone**: re-seed the first participant and invite
everyone again.

| Survives the teardown | Rebuild or update |
|---|---|
| The Hetzner project, its SSH keys and the `halloween-map` firewall | The server (new IP) |
| The IONOS zone and the `$SUBDOMAIN` A record | The A record's value (new IP) |
| GitHub variables and secrets, the keys in `cert/` | The `HETZNER_HOST` secret (new IP) |
| The API image on `ghcr.io` | The seeded space and first participant |

## 0. Terminal setup

```bash
set -a; source deploy/hetzner/config.env; set +a
export API_DOMAIN="$SUBDOMAIN.$DOMAIN"
ssh-keygen -y -P "" -f cert/id_hetzner >/dev/null && echo "CI key ok, no passphrase"
```

Export `IONOS_API_KEY` in the shell too (step 2).

## 1. Provision

```bash
sed -e "s#\${CI_PUBLIC_KEY}#$(cat cert/id_hetzner.pub)#" \
    -e "s#\${ADMIN_PUBLIC_KEY}#$(cat cert/id_hetzner_admin.pub)#" \
    deploy/hetzner/user-data.yml.tmpl > deploy/hetzner/user-data.yml

CI_KEY_NAME=$(scripts/hcloud-ensure-ssh-key.sh github-actions-deploy cert/id_hetzner.pub)
ADMIN_KEY_NAME=$(scripts/hcloud-ensure-ssh-key.sh admin cert/id_hetzner_admin.pub)

hcloud server create --name halloween-map \
  --image "$HETZNER_IMAGE" --type "$HETZNER_SERVER_TYPE" --location "$HETZNER_LOCATION" \
  --ssh-key "$CI_KEY_NAME" --ssh-key "$ADMIN_KEY_NAME" \
  --firewall halloween-map \
  --user-data-from-file deploy/hetzner/user-data.yml

export SERVER_IP=$(hcloud server ip halloween-map)
until ssh -i cert/id_hetzner -o StrictHostKeyChecking=accept-new deploy@"$SERVER_IP" docker --version; do sleep 5; done
```

If the firewall is gone too, recreate it with the `hcloud-ensure-firewall.sh`
command in `HETZNER_DEPLOY.md` step 1 first. A name conflict on `server create`
means the old server still exists (`hcloud server list`).

## 2. DNS

```bash
SERVER_IP="$SERVER_IP" scripts/ionos-dns-upsert.sh
dig +short "$API_DOMAIN" @1.1.1.1    # wait until this prints $SERVER_IP
```

## 3. Secrets

```bash
gh secret set HETZNER_HOST --repo "$GITHUB_REPO" --body "$SERVER_IP"
gh secret list --repo "$GITHUB_REPO"     # the rest should still be there
gh variable list --repo "$GITHUB_REPO"   # API_DOMAIN
```


## 4. Deploy, seed, check

```bash
gh workflow run deploy.yml --repo "$GITHUB_REPO" && gh run watch --repo "$GITHUB_REPO"

ssh -i cert/id_hetzner_admin deploy@"$SERVER_IP" \
  "cd /opt/halloween-map && docker compose -f docker-compose.prod.yml exec -T \
   -e SEED_SPACE_PARTICIPANT_EMAIL=$SEED_SPACE_PARTICIPANT_EMAIL api pnpm seed:space"

curl "https://$API_DOMAIN/health"    # {"ok":true}
```

Then [`VALIDATE_PRODUCTION.md`](./VALIDATE_PRODUCTION.md).

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `ssh: handshake failed ... unable to authenticate` in the deploy | `HETZNER_HOST` is the old IP, or `HETZNER_SSH_KEY` doesn't match the server. Check locally: `ssh -i cert/id_hetzner deploy@"$SERVER_IP" whoami`. |
| `denied` / `manifest unknown` on `pull api` | The image push in the same run failed, or the `halloween-map-api` package isn't linked to this repo (package settings → Manage Actions access). |
| TLS error on `/health` | DNS doesn't point at the new server yet, or 80/443 are closed. Then `docker compose -f docker-compose.prod.yml restart caddy`. |
| Deploy green, `/health` refused | The API crashed: `docker compose -f docker-compose.prod.yml logs api`. It refuses to start on a bad `EVENT_END_AT` or a missing `SPACE_JWT_SECRET`. |
| The site loads but every request fails (CORS in the console) | `CLIENT_ORIGIN` isn't exactly `https://halloween.cowglow.io`. |
