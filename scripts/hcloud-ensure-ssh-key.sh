#!/usr/bin/env bash
# Idempotently ensures a public key is registered as an SSH key in whatever
# Hetzner Cloud project `hcloud` is currently pointed at. Matches by
# fingerprint, not name: Hetzner rejects re-uploading a public key that's
# already registered under ANY name, so a plain `hcloud ssh-key create` fails
# outright on a second run against a project where the key already exists
# (e.g. from before this automation existed, or a previous run of it).
#
# Prints the key's name (existing or newly created) to stdout, so callers can
# pass it straight to `hcloud server create --ssh-key`:
#
#   CI_KEY_NAME=$(scripts/hcloud-ensure-ssh-key.sh github-actions-deploy cert/id_hetzner.pub)
#
# Usage: hcloud-ensure-ssh-key.sh <desired-name> <path-to-public-key>
set -euo pipefail

DESIRED_NAME="${1:?Usage: hcloud-ensure-ssh-key.sh <desired-name> <path-to-public-key>}"
PUBKEY_FILE="${2:?Usage: hcloud-ensure-ssh-key.sh <desired-name> <path-to-public-key>}"

fingerprint="$(ssh-keygen -lf "$PUBKEY_FILE" -E md5 | awk '{print $2}' | sed 's/^MD5://')"

existing_name="$(hcloud ssh-key list -o json | jq -r --arg fp "$fingerprint" \
  '.[] | select(.fingerprint == $fp) | .name' | head -1)"

if [ -n "$existing_name" ]; then
  echo "Reusing existing Hetzner SSH key '${existing_name}' (fingerprint matches ${PUBKEY_FILE})" >&2
  echo "$existing_name"
else
  echo "Registering new Hetzner SSH key '${DESIRED_NAME}' from ${PUBKEY_FILE}" >&2
  hcloud ssh-key create --name "$DESIRED_NAME" --public-key-from-file "$PUBKEY_FILE" >&2
  echo "$DESIRED_NAME"
fi
