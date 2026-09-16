import type { StyleSpecification } from "maplibre-gl";

/**
 * App-wide constants.
 *
 * `API_BASE_URL` points at the Go backend's `/api` prefix. In local dev the
 * backend runs on :8080 while this SPA runs on the Vite dev server (:5173), so
 * calls are cross-origin — the api client sends `credentials: "include"` and the
 * backend enables CORS with credentials (see backend README).
 *
 * Override at build/dev time with `VITE_API_BASE_URL` (e.g. for a deployed
 * backend). See https://vite.dev/guide/env-and-mode.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

/**
 * Public routes that must render without an authenticated session.
 * `/` (landing) and `/search` (public plot search) are open to everyone —
 * /search renders its own logged-out mode for a stale/expired cookie rather
 * than bouncing to /login. /customer used to be here too (it doubled as the
 * plot search before the tenant nav split Home from Search — see issue #27);
 * now it's Home only, requires a real customer session, and gets the normal
 * forceLogout()-to-/login treatment like any other role-guarded page.
 *
 * Matched with `startsWith`, so "/" would match every path — the landing page
 * is handled by the exact-match check in forceLogout() instead of living here.
 */
export const PUBLIC_PATHS = ["/login", "/register", "/search"] as const;

/**
 * MapLibre style for the field/plot map: Esri World Imagery satellite tiles.
 * Keyless, no registration, the standard free satellite basemap for
 * open-source mapping tools — used with attribution per Esri's terms (the
 * `attribution` field below, which MapLibre's attribution control renders
 * automatically). Note the tile URL's `{z}/{y}/{x}` order — ArcGIS's own
 * convention (row before column), NOT the OSM-style `{z}/{x}/{y}` used by
 * MAP_STYLE_URL_STREETS below.
 *
 * Satellite imagery has no street labels, so the drawn field/plot shapes
 * (see field-map.tsx) are the only visual reference a farmer has for where
 * they are on the map — keep their fill/outline readable against varied
 * imagery (the current emerald tones already are).
 *
 * `glyphs` points at MapLibre's own public demo glyph server so the plot
 * number labels (see field-map.tsx's symbol layer) have fonts to render —
 * this bare raster style otherwise ships no font source at all. Same spirit
 * as the Esri tiles and Nominatim lookups elsewhere: a free, keyless, public
 * endpoint the MapLibre project provides for exactly this purpose.
 */
export const MAP_STYLE_URL: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "esri-world-imagery": {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: "Esri, Vantor, Earthstar Geographics, and the GIS User Community",
    },
  },
  layers: [{ id: "esri-world-imagery", type: "raster", source: "esri-world-imagery" }],
};

/**
 * Street-map alternative (OpenFreeMap's public "Liberty" style), kept as a
 * documented fallback if satellite context is ever swapped back out for
 * street/label context. Keyless, no registration, no published request cap —
 * unlike raw tile.openstreetmap.org, which is governed by a usage policy
 * (https://operations.osmfoundation.org/policies/tiles/) that expects an
 * identifying User-Agent/Referer (neither settable from browser fetch) and
 * treats heavy interactive panning/zooming as block-worthy without notice.
 * See https://openfreemap.org/. Not wired up by default.
 */
// export const MAP_STYLE_URL_STREETS = "https://tiles.openfreemap.org/styles/liberty";

/**
 * Fallback raster style over OSM tiles directly, kept only as a documented
 * escape hatch if OpenFreeMap ever becomes unavailable. Not wired up by
 * default — see the MAP_STYLE_URL_STREETS comment for why OSM raster isn't
 * the default choice.
 */
// export const OSM_RASTER_STYLE = {
//   version: 8,
//   sources: {
//     "raster-tiles": {
//       type: "raster",
//       tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
//       tileSize: 256,
//       minzoom: 0,
//       maxzoom: 19,
//       attribution: "© OpenStreetMap contributors",
//     },
//   },
//   layers: [{ id: "simple-tiles", type: "raster", source: "raster-tiles" }],
// } as const;

/**
 * Nominatim's public search endpoint, used once per postal code to centre the
 * map (see ~/lib/geocode.ts). Restricted to Germany since postal codes are
 * only meaningful within a country.
 */
export const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
