# Sourced by deploy/thank-you.sh and deploy/teardown.sh, run from the app's
# folder on the server (where docker-compose.prod.yml, .env and community/
# are). Sets SLUG, END_S (the event end, seconds since the epoch) and NOW_S.
# EVENT_END_AT in .env wins over community.json's eventEndAt, as in the API.
json_field() { sed -n "s/.*\"$1\": *\"\\([^\"]*\\)\".*/\\1/p" community/community.json | head -1; }
SLUG=$(json_field slug)
END=$(grep '^EVENT_END_AT=' .env 2>/dev/null | cut -d= -f2-)
[ -n "$END" ] || END=$(json_field eventEndAt)
END_S=$(date -d "$END" +%s) || exit 1
NOW_S=$(date -u +%s)
COMPOSE="docker compose -f docker-compose.prod.yml"
