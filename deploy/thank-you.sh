#!/bin/sh
# The thank-you email (docs/SELF_HOSTING.md, "The end of the event"): run
# from cron every 5 minutes. It does nothing until 15 minutes before the
# event end, then sends to everyone not yet thanked, so the next runs pick up
# late joiners and retry failures. Prints counts only, never addresses.
set -u
cd "$(dirname "$0")/.." || exit 1
[ -f .env ] || exit 0 # torn down
. deploy/event-time.sh
[ "$NOW_S" -ge $((END_S - 15 * 60)) ] && [ "$NOW_S" -lt "$END_S" ] || exit 0
$COMPOSE exec -T api pnpm -s thank:space -- --slug "$SLUG" --yes --within-minutes 15
