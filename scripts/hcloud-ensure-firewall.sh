#!/usr/bin/env bash
# Idempotently ensures a Hetzner Cloud firewall with the given name exists,
# creating it from the given rules file only if it's missing. Plain
# `hcloud firewall create` errors if the name is already taken (e.g. it
# survived a server teardown, or a previous run of this same setup), so this
# checks first via `hcloud firewall describe` instead of assuming a clean
# project.
#
# Does NOT update rules on an already-existing firewall — if you've changed
# the rules file and need them applied to a firewall that already exists, use
# `hcloud firewall replace-rules` by hand.
#
# Usage: hcloud-ensure-firewall.sh <name> <path-to-rules-json>
#
#   scripts/hcloud-ensure-firewall.sh halloween-map <(cat <<'EOF'
#   [{"direction": "in", "protocol": "tcp", "port": "22", "source_ips": ["0.0.0.0/0", "::/0"]}]
#   EOF
#   )
set -euo pipefail

NAME="${1:?Usage: hcloud-ensure-firewall.sh <name> <path-to-rules-json>}"
RULES_FILE="${2:?Usage: hcloud-ensure-firewall.sh <name> <path-to-rules-json>}"

if hcloud firewall describe "$NAME" >/dev/null 2>&1; then
  echo "Reusing existing Hetzner firewall '${NAME}'" >&2
else
  echo "Creating Hetzner firewall '${NAME}'" >&2
  hcloud firewall create --name "$NAME" --rules-file "$RULES_FILE" >&2
fi
