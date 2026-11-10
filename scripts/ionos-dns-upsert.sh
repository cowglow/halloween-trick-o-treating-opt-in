#!/usr/bin/env bash
# Idempotently point DOMAIN's SUBDOMAIN A record at SERVER_IP via the IONOS
# hosting DNS API (https://api.hosting.ionos.com/dns/v1 — the domains/hosting
# API for a zone managed at ionos.de/.com, not IONOS Cloud's separate DNS
# product). Only ever touches that one record: looks it up by name+type first,
# PUTs an update if it exists, POSTs a new record if it doesn't. Never
# replaces or lists other records in the zone.
#
# Required env vars:
#   IONOS_API_KEY  - from the IONOS hosting console's API Keys section.
#                    Export it in your shell, don't put it in a committed file
#                    (same treatment as GHCR_PAT in docs/HETZNER_DEPLOY.md).
#   DOMAIN         - e.g. cowglow.io (must match a zone name exactly)
#   SUBDOMAIN      - e.g. api
#   SERVER_IP      - the Hetzner server's public IP
# Optional:
#   TTL            - default 3600
set -euo pipefail

: "${IONOS_API_KEY:?Set IONOS_API_KEY (IONOS hosting console -> API Keys)}"
: "${DOMAIN:?Set DOMAIN, e.g. cowglow.io}"
: "${SUBDOMAIN:?Set SUBDOMAIN, e.g. api}"
: "${SERVER_IP:?Set SERVER_IP to the Hetzner servers public IP}"
TTL="${TTL:-3600}"

BASE="https://api.hosting.ionos.com/dns/v1"

api() {
  curl -sS -f -H "X-API-Key: ${IONOS_API_KEY}" -H "Accept: application/json" "$@"
}

zone_id=$(api "${BASE}/zones" | jq -r --arg d "$DOMAIN" '.[] | select(.name == $d) | .id')
if [ -z "$zone_id" ]; then
  echo "No IONOS zone named '${DOMAIN}' found for this API key." >&2
  exit 1
fi

record_id=$(api "${BASE}/zones/${zone_id}?recordName=${SUBDOMAIN}.${DOMAIN}&recordType=A" \
  | jq -r '.records[0].id // empty')

if [ -n "$record_id" ]; then
  echo "Updating existing A record ${SUBDOMAIN}.${DOMAIN} (${record_id}) -> ${SERVER_IP}"
  curl -sS -f -X PUT "${BASE}/zones/${zone_id}/records/${record_id}" \
    -H "X-API-Key: ${IONOS_API_KEY}" -H "Content-Type: application/json" \
    -d "{\"content\": \"${SERVER_IP}\", \"ttl\": ${TTL}, \"disabled\": false}" \
    >/dev/null
else
  echo "Creating A record ${SUBDOMAIN}.${DOMAIN} -> ${SERVER_IP}"
  curl -sS -f -X POST "${BASE}/zones/${zone_id}/records" \
    -H "X-API-Key: ${IONOS_API_KEY}" -H "Content-Type: application/json" \
    -d "[{\"name\": \"${SUBDOMAIN}\", \"type\": \"A\", \"content\": \"${SERVER_IP}\", \"ttl\": ${TTL}, \"disabled\": false}]" \
    >/dev/null
fi

echo "Done. Verify with: dig +short ${SUBDOMAIN}.${DOMAIN} @1.1.1.1"
