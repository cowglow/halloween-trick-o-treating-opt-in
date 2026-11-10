#!/usr/bin/env bash
# docs/SPEC.md section 4: builds the community's .pmtiles archive from
# Protomaps' latest daily OpenStreetMap build, clipped to the bounding box of
# community/community.json's boundary plus a small buffer (so panning right
# up to the edge of the boundary doesn't reveal blank tiles), and writes it
# to public/tiles/<map.tiles>. Requires the go-pmtiles CLI (`pmtiles`) -
# install from https://github.com/protomaps/go-pmtiles/releases - node, and
# network access to build.protomaps.com.
#
# The build list lives at build-metadata.protomaps.dev/builds.json (sorted
# oldest first; found via the source of maps.protomaps.com/builds, since the
# old build.protomaps.com/builds.json path 404s). Each entry's `key` is a
# filename under https://build.protomaps.com/. Override the go-pmtiles binary
# with PMTILES_BIN if it isn't on PATH.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/public/tiles"
CONFIG="$ROOT_DIR/community/community.json"
# Bump the "-v1" in map.tiles on a rebuild, so a stale service-worker cache
# entry (public/sw.js) can never serve mismatched tiles.
read -r OUT_NAME MIN_LON MIN_LAT MAX_LON MAX_LAT < <(node -e '
  const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf-8"));
  const ring = c.map.boundary;
  // About 300 m on each side.
  const BUFFER_DEG = 0.003;
  const lngs = ring.map((p) => p[0]), lats = ring.map((p) => p[1]);
  console.log(c.map.tiles, Math.min(...lngs) - BUFFER_DEG, Math.min(...lats) - BUFFER_DEG,
    Math.max(...lngs) + BUFFER_DEG, Math.max(...lats) + BUFFER_DEG);
' "$CONFIG")
OUT_FILE="$OUT_DIR/$OUT_NAME"

PMTILES_BIN="${PMTILES_BIN:-pmtiles}"
if ! command -v "$PMTILES_BIN" >/dev/null 2>&1; then
  echo "error: the go-pmtiles CLI ('pmtiles') is not installed." >&2
  echo "Install it from https://github.com/protomaps/go-pmtiles/releases, then re-run this script." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "Looking up the latest Protomaps daily build..."
LATEST_BUILD_URL="$(curl -fsSL https://build-metadata.protomaps.dev/builds.json | node -e '
  const data = JSON.parse(require("fs").readFileSync(0, "utf-8"));
  if (!Array.isArray(data) || data.length === 0) throw new Error("builds.json was empty or not a list");
  const latest = data.reduce((a, b) => (b.uploaded > a.uploaded ? b : a));
  process.stdout.write("https://build.protomaps.com/" + latest.key);
')"

if [ -z "$LATEST_BUILD_URL" ]; then
  echo "error: could not determine the latest build URL from builds.json" >&2
  exit 1
fi

echo "Extracting $MIN_LON,$MIN_LAT,$MAX_LON,$MAX_LAT from $LATEST_BUILD_URL"
"$PMTILES_BIN" extract "$LATEST_BUILD_URL" "$OUT_FILE" \
  --bbox="$MIN_LON,$MIN_LAT,$MAX_LON,$MAX_LAT"

echo "Wrote $OUT_FILE"
echo "Remember to also bundle glyphs (font PBFs) and a sprite sheet locally under"
echo "public/fonts/ and public/sprite/ - see docs/WORKLOG.md for what's"
echo "still missing there, and check font licenses before bundling (also noted there)."
