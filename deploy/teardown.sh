#!/bin/sh
# The automatic end of the event (docs/SELF_HOSTING.md, "The end of the
# event"): run from cron every minute. One minute after the event end it
# purges the space's data, stops the containers and deletes their volumes
# (the database and Caddy's certificates), deletes .env (the database
# password and API keys) and removes this app's crontab lines. Deleting the
# server itself stays manual. The time is checked against the absolute event
# end, so the server's time zone doesn't matter. Prints counts only, never
# addresses.
set -u
cd "$(dirname "$0")/.." || exit 1
[ -f .env ] || exit 0 # already torn down
. deploy/event-time.sh
[ "$NOW_S" -ge $((END_S + 60)) ] || exit 0

date -u +%Y-%m-%dT%H:%M:%SZ
# purge:space refuses while someone hasn't had the thank-you email. After
# EVENT_END_AT it can't be sent any more, and deleting at midnight is the
# promise that matters, so purge anyway.
if ! $COMPOSE exec -T api pnpm -s purge:space -- --slug "$SLUG" --yes; then
  echo "Purging without the thank-you for those listed above."
  $COMPOSE exec -T api pnpm -s purge:space -- --slug "$SLUG" --yes --without-thanks ||
    { echo "Purge failed; trying again in a minute."; exit 1; }
fi
$COMPOSE down --volumes
rm -f .env
crontab -l | grep -v '# halloween-' | crontab -
echo "Torn down. Delete the server by hand (docs/SELF_HOSTING.md)."
