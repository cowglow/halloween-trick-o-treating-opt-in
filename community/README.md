# Your community

`community.json` is the one place that says where and when the map runs.
The frontend reads it at build time and the backend at startup, so after
changing it, rebuild both. It's set up for Meckenhausen, the village the map
was made for in 2026: replace every value.

| Field | What it is |
| --- | --- |
| `name` | The community's name, as people say it. It goes into the app's texts and emails ("Inside Meckenhausen", "the Halloween map for Meckenhausen"). |
| `slug` | Lowercase letters, numbers and hyphens: the map's address (`#/meckenhausen`) and its row in the database. |
| `organizer` | Who signs the thank-you email: a first name, or the group's name. Replies go to `THANK_YOU_REPLY_TO`. |
| `hostingProvider` | Who hosts your server, named in the privacy notice ("Hetzner hosts the server…"). Emails always go through Resend, which the notice names too. Read the whole notice (`spacePrivacy` in `frontend/ports/i18n/translations/`) and make sure it matches how you run the map. |
| `timeZone` | An IANA time zone (`Europe/Berlin`). Dates in the app and emails are shown in it. |
| `eventEndAt` | When the map closes and everything is deleted, ISO 8601 with offset: usually midnight after Halloween. `EVENT_END_AT` (backend) and `VITE_EVENT_END_AT` (frontend) override it. |
| `defaultLanguage` | `en`, `de` or `es`: the language of emails to people whose language isn't known yet. (The app itself follows the browser, and English for browsers in none of the three.) |
| `map.center` | Where the map opens. |
| `map.boundary` | The area pins may be placed in: a closed ring of `[longitude, latitude]` points (the first point repeated at the end). The map can't be panned beyond its bounding box. |
| `map.tiles` | The map file in `public/tiles/`. See below. |

## The boundary

Meckenhausen has no outline in OpenStreetMap, so its boundary is the
bounding box Nominatim returned for the village (looked up once, on
2026-09-21; the app never calls OpenStreetMap at runtime):

    https://nominatim.openstreetmap.org/search?q=Meckenhausen,Hilpoltstein,Bavaria,Germany&format=jsonv2&polygon_geojson=1

If your place has an outline there, use its polygon ring instead.

## The map tiles

The map is a single [PMTiles](https://docs.protomaps.com/pmtiles/) file
served with the site, so viewing the map makes no requests to anyone else.
Set `map.tiles` to a new file name (keep the `-v1`, bump it on a rebuild),
then run `scripts/build-tiles.sh`: it cuts your boundary's area (plus about
300 m) out of the latest Protomaps build into `public/tiles/`. It needs the
[`pmtiles` CLI](https://github.com/protomaps/go-pmtiles/releases).

`public/tiles/meckenhausen-v1.pmtiles` stays in the repo as the demo map. The data is © OpenStreetMap contributors
(ODbL); the app shows the attribution.
