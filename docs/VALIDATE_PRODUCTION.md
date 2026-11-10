# Validating production

A checklist to run after a deploy (`docs/HETZNER_DEPLOY.md`), first from the
terminal and then on a phone. Set these once per terminal:

```bash
set -a; source deploy/hetzner/config.env; set +a
export API_DOMAIN="$SUBDOMAIN.$DOMAIN"
export SITE=https://halloween.cowglow.io
export SERVER_IP=YOUR_SERVER_IP
export HETZNER_KEY=cert/id_hetzner_admin   # your key, not the CI key
alias prod="ssh -i $HETZNER_KEY deploy@$SERVER_IP docker compose -f /opt/halloween-map/docker-compose.prod.yml"
```

## 1. The deploy ran

```bash
gh run list --repo "$GITHUB_REPO" --workflow=deploy.yml --limit 3
```

The latest run should be `completed` / `success`. If it failed:
`gh run view --log-failed --repo "$GITHUB_REPO"` shows which job broke.

## 2. DNS, TLS and health

```bash
dig +short "$API_DOMAIN"                  # the server's IP
curl -sS "https://$API_DOMAIN/health"     # {"ok":true}
echo | openssl s_client -connect "$API_DOMAIN:443" -servername "$API_DOMAIN" 2>/dev/null \
  | openssl x509 -noout -dates -subject   # notAfter in the future, subject = $API_DOMAIN
```

## 3. CORS allows the real site, and only it

```bash
for origin in https://halloween.cowglow.io https://example.com; do
  echo "$origin -> $(curl -sS -i -X OPTIONS "https://$API_DOMAIN/spaces/meckenhausen" \
    -H "Origin: $origin" -H "Access-Control-Request-Method: GET" \
    | grep -i '^access-control-allow-origin' | tr -d '\r')"
done
```

Both lines show `access-control-allow-origin: https://halloween.cowglow.io`: the
API always answers with the one allowed origin, and a browser on any other
origin rejects that. If the value is anything else, the `CLIENT_ORIGIN` secret
is wrong.

## 4. The API behaves like production

```bash
# The space exists (seeded, docs/HETZNER_DEPLOY.md step 7):
curl -sS "https://$API_DOMAIN/spaces/meckenhausen"

# No dev token is ever handed out (NODE_ENV=production):
curl -sS -X POST "https://$API_DOMAIN/spaces/meckenhausen/magic-link" \
  -H 'Content-Type: application/json' -d '{"email":"nobody@example.com"}'
# {"message":"..."} - and no "devToken" field

# Pins are not public:
curl -sS -o /dev/null -w "%{http_code}\n" "https://$API_DOMAIN/spaces/meckenhausen/locations"   # 401

# Oversized bodies are refused:
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "https://$API_DOMAIN/spaces/meckenhausen/magic-link" \
  -H 'Content-Type: application/json' -d "{\"email\":\"$(head -c 9000 /dev/zero | tr '\0' x)\"}"   # 413
```

The magic-link request above counts against the sign-in rate limit (20 per 15
minutes per IP); don't loop it.

## 5. The site is live and points at this API

```bash
curl -sS -o /dev/null -w "%{http_code}\n" "$SITE/"     # 200
JS=$(curl -sS "$SITE/" | grep -o 'assets/index-[^"]*\.js' | head -1)
curl -sS "$SITE/$JS" | grep -o "https://$API_DOMAIN" | head -1                # https://$API_DOMAIN
curl -sS "$SITE/" | grep -o "connect-src[^;]*"                                 # 'self' https://$API_DOMAIN
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" "$SITE/tiles/meckenhausen-v1.pmtiles"   # 200, not text/html
```

The second check catches a build that fell back to `http://localhost:4000`. The
last one catches the tiles being answered by an HTML 404 page.

## 6. The server

```bash
prod ps                                   # db (healthy), api, caddy: all Up
prod logs --tail=50 api                   # no stack traces
prod exec -T api pnpm prisma migrate status   # "Database schema is up to date"
ssh -i $HETZNER_KEY deploy@$SERVER_IP "df -h /"
```

## 7. On a phone, end to end

From the seeded participant's email (with Resend set up) or the API log (without
it: `prod logs api | grep mailer`):

1. Open the sign-in link: you land signed in as **Participant**.
2. **Add your pin**: pan and pinch the map, try **Use my location**, confirm,
   fill in a name, tick consent, save. The pin shows on the map and in the list.
3. **Invite** a second address as **visitor**. Open that invite on another
   device, accept with consent: the visitor sees your pin read-only and has no
   **Add your pin**.
4. Install the site (Add to Home Screen), open it once online, then in airplane
   mode: the map, tiles and pins still show, with a "You're offline" notice.
5. On the visitor device: **Remove me**. That person is gone and can't sign in
   again.
6. In the browser's devtools (desktop): no CSP errors in the console, and every
   request goes to either `halloween.cowglow.io` or `$API_DOMAIN`.
