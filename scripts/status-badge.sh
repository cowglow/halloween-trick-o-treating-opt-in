#!/usr/bin/env bash
# Writes a shields.io-style status badge as a static SVG, for the README.
# The repo is private, so GitHub's own workflow badges don't load; the
# workflows publish these to the site instead (deploy.yml, test.yml).
#
#   scripts/status-badge.sh "Tests" "passing" ok dist/tests-badge.svg
#
# The third argument is `ok` (green) or anything else (red). Widths are
# estimated at 7px per character of 11px Verdana, plus padding.
set -euo pipefail

LABEL="$1"
MESSAGE="$2"
if [ "$3" = "ok" ]; then COLOR="#4c1"; else COLOR="#e05d44"; fi
OUT="$4"

LABEL_WIDTH=$(( ${#LABEL} * 7 + 10 ))
MSG_WIDTH=$(( ${#MESSAGE} * 7 + 10 ))
TOTAL_WIDTH=$(( LABEL_WIDTH + MSG_WIDTH ))
LABEL_CENTER=$(( LABEL_WIDTH * 10 / 2 ))
MSG_CENTER=$(( (LABEL_WIDTH * 2 + MSG_WIDTH) * 10 / 2 ))

mkdir -p "$(dirname "$OUT")"
cat > "$OUT" << SVG
<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL_WIDTH}" height="20" role="img" aria-label="${LABEL}: ${MESSAGE}">
  <title>${LABEL}: ${MESSAGE}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${TOTAL_WIDTH}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${LABEL_WIDTH}" height="20" fill="#555"/>
    <rect x="${LABEL_WIDTH}" width="${MSG_WIDTH}" height="20" fill="${COLOR}"/>
    <rect width="${TOTAL_WIDTH}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text x="${LABEL_CENTER}" y="140" transform="scale(.1)" fill="#010101" fill-opacity=".3">${LABEL}</text>
    <text x="${LABEL_CENTER}" y="130" transform="scale(.1)">${LABEL}</text>
    <text x="${MSG_CENTER}" y="140" transform="scale(.1)" fill="#010101" fill-opacity=".3">${MESSAGE}</text>
    <text x="${MSG_CENTER}" y="130" transform="scale(.1)">${MESSAGE}</text>
  </g>
</svg>
SVG
