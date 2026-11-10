// The map's self-hosted style. Everything it loads comes from this site
// (docs/SPEC.md section 3: "NO third-party requests at runtime: self-hosted
// tiles, fonts, sprites, scripts; no CDNs").
import { spaceAssetUrl } from "infrastructure/space-assets/space-asset-url.ts";
import { addProtocol, setWorkerUrl, type LayerSpecification, type StyleSpecification } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { layers, namedFlavor } from "@protomaps/basemaps";
import { COMMUNITY, COMMUNITY_BOUNDARY_RING, COMMUNITY_CENTER } from "domain/community/community-config.ts";

// Registers the `pmtiles://` URL protocol with MapLibre so a style can
// reference a local .pmtiles archive as a vector source without a tile
// server - idempotent, safe to call more than once (e.g. from both the map
// component and a test). docs/SPEC.md section 4: "register the pmtiles protocol."
let protocolRegistered = false;
export function registerPmtilesProtocol(): void {
  if (protocolRegistered) return;
  // See maplibreWorkerPlugin in vite.config.ts: without this the worker URL
  // 404s and the map never paints.
  setWorkerUrl(spaceAssetUrl("maplibre/maplibre-gl-worker.mjs"));
  const protocol = new Protocol();
  addProtocol("pmtiles", protocol.tile);
  protocolRegistered = true;
}

// Versioned filename (docs/SPEC.md section 4: "producing one static .pmtiles file
// with a versioned filename") - bump this alongside scripts/build-tiles.sh
// whenever the archive is rebuilt, so a stale service-worker cache entry
// (infrastructure/service-worker/) can never serve mismatched tiles.
export const PMTILES_FILENAME = COMMUNITY.map.tiles;
export const PMTILES_URL = spaceAssetUrl(`tiles/${PMTILES_FILENAME}`);

// docs/SPEC.md section 4: "If the CLI or network is unavailable, log it as a
// blocker and continue against a placeholder style (boundary outline on a
// plain background)." That's the situation this session is actually in (see
// docs/WORKLOG.md - no go-pmtiles CLI, no network to build.protomaps.com) -
// this is real, working, and self-hosted (a GeoJSON source built from the
// committed boundary constant, no network requests at all), not a stub.
export function placeholderStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      boundary: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [COMMUNITY_BOUNDARY_RING.map(([lng, lat]) => [lng, lat])] },
        },
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#eef1ea" } },
      {
        id: "boundary-fill",
        type: "fill",
        source: "boundary",
        paint: { "fill-color": "#d8e4d0", "fill-opacity": 0.6 },
      },
      {
        id: "boundary-outline",
        type: "line",
        source: "boundary",
        paint: { "line-color": "#4a6741", "line-width": 2, "line-dasharray": [2, 2] },
      },
    ],
    // No `glyphs`/`sprite` entries - this style has no symbol/label layers, so
    // there's nothing for MapLibre to fetch for them (leaving them out is what
    // keeps this a genuinely zero-request style, not just an unused config
    // pointing at local paths that happen to 404).
  };
}

// The real style, once scripts/build-tiles.sh has produced a `.pmtiles` file
// (docs/SPEC.md: "I will supply the file later") and the glyph/sprite assets below
// are bundled under public/ - see docs/WORKLOG.md for exactly what's
// still missing. `layers()`/`namedFlavor()` come from @protomaps/basemaps
// (the official, MIT-licensed layer-style generator matching Protomaps'
// "basemaps" vector schema - not a runtime CDN dependency, just style JSON
// generation), so this repo never hand-rolls paint rules for ~90 layers.
// `osmAttribution` is "© OpenStreetMap contributors" in the reader's language;
// the source's attribution is the only one the map shows.
export function pmtilesStyle(lang: "en" | "de", osmAttribution: string): StyleSpecification {
  return {
    version: 8,
    // Bundled locally (docs/SPEC.md: "Glyphs (font PBFs) and sprites must be
    // bundled locally"). Not yet present in this checkout - see the blocker
    // noted in docs/WORKLOG.md; MapLibre will 404 on label/icon layers until
    // they're added under these paths, but every non-label layer (roads,
    // buildings, water, landuse) still renders.
    glyphs: spaceAssetUrl("fonts/{fontstack}/{range}.pbf"),
    sprite: spaceAssetUrl("sprite/sprite"),
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${PMTILES_URL}`,
        attribution: `${osmAttribution}, © Protomaps`,
      },
    },
    // @protomaps/basemaps pins its own (older) @maplibre/maplibre-gl-style-spec
    // internally, which this repo's maplibre-gl@6.9.0 doesn't structurally
    // match at the type level even though the runtime JSON shape is fine (it's
    // the same MapLibre style spec both packages target) - a version-skew type
    // cast, not a real type hole; see docs/WORKLOG.md.
    layers: layers("protomaps", namedFlavor("light"), { lang }) as unknown as LayerSpecification[],
  };
}

export { COMMUNITY_CENTER };
