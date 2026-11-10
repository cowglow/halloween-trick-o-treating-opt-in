#!/usr/bin/env bash
# Ensures a locally-trusted HTTPS certificate exists for the Vite dev server, so
# browsers treat https://localhost:3000 as fully secure - no click-through
# warning, and no permission (geolocation, etc.) getting reset because the
# self-signed cert changed on the last restart. Safe to re-run: skips work
# that's already done. See vite.config.ts for how the result gets used.
#
# Also covers the machine's current LAN IP, not just localhost - `pnpm dev`
# already binds to 0.0.0.0 (`vite --host`), and testing from a phone on the
# same Wi-Fi is the main reason HTTPS matters at all here (localhost itself is
# already a secure context without a cert - see docs/DEV-HTTPS.md). Since a
# laptop's LAN IP can change between sessions (DHCP), this re-checks the
# existing cert's SANs against the current IP and regenerates only if it's
# missing, rather than trusting "the files exist" alone.
set -euo pipefail

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/cert"
CERT_FILE="$CERT_DIR/localhost.pem"
KEY_FILE="$CERT_DIR/localhost-key.pem"

# macOS-first (this repo's primary dev platform); falls back to a generic
# `hostname -I` for Linux. Empty if neither works - LAN coverage is then just
# skipped, not a hard failure (localhost/127.0.0.1 still work).
lan_ip() {
  if command -v ipconfig >/dev/null 2>&1; then
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
  elif command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | awk '{print $1}' || true
  fi
}

LAN_IP="$(lan_ip)"

cert_covers_ip() {
  local ip="$1"
  [ -f "$CERT_FILE" ] && command -v openssl >/dev/null 2>&1 && \
    openssl x509 -in "$CERT_FILE" -noout -text 2>/dev/null | grep -q "IP Address:$ip"
}

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ] && { [ -z "$LAN_IP" ] || cert_covers_ip "$LAN_IP"; }; then
  exit 0
fi

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert is not installed - falling back to vite-plugin-basic-ssl's untrusted cert." >&2
  echo "For a trusted cert (recommended, and required for phone testing - see docs/DEV-HTTPS.md), install mkcert first:" >&2
  echo "  macOS:   brew install mkcert" >&2
  echo "  other:   https://github.com/FiloSottile/mkcert#installation" >&2
  exit 0
fi

mkdir -p "$CERT_DIR"

# Installs mkcert's local CA into the OS/browser trust stores. Idempotent - a
# no-op if already installed (as it likely already is on this machine).
mkcert -install

if [ -n "$LAN_IP" ]; then
  mkcert -cert-file "$CERT_FILE" -key-file "$KEY_FILE" localhost 127.0.0.1 ::1 "$LAN_IP"
  echo "Dev HTTPS certificate ready at $CERT_DIR (covers localhost and $LAN_IP)"
else
  mkcert -cert-file "$CERT_FILE" -key-file "$KEY_FILE" localhost 127.0.0.1 ::1
  echo "Dev HTTPS certificate ready at $CERT_DIR (couldn't detect a LAN IP - localhost only, see docs/DEV-HTTPS.md)"
fi
