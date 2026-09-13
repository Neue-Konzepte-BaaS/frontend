import { NOMINATIM_URL } from "~/lib/constants";

/**
 * Resolves a German postal code to a map centre point, via Nominatim
 * (OpenStreetMap's geocoder).
 *
 * This deliberately does NOT go through ~/lib/api-client: that client
 * prefixes every path with our own backend's API_BASE_URL and always sends
 * `credentials: "include"`, which would be wrong for a third-party host (it
 * would mangle the URL and could leak our auth cookies cross-origin to
 * Nominatim). This module owns its own bare `fetch` instead — if you're
 * tempted to "fix" that inconsistency, don't; it's intentional.
 *
 * Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/)
 * caps the public instance at ~1 request/second *per application* (i.e. the
 * sum of all our users' traffic, not per user) and explicitly forbids
 * anything resembling autocomplete. A postal code's centroid never moves, so
 * every lookup is cached indefinitely in localStorage and this function is
 * only ever called once per postal code, never wired to keystrokes or typing.
 */

export type LatLon = { lat: number; lon: number };

/** Karlsruhe. Used whenever geocoding fails or there is no postal code to look up. */
export const FALLBACK_CENTER: LatLon = { lat: 49.0069, lon: 8.4037 };

/** Reasonable default zoom for an unresolved/region-level view. */
export const FALLBACK_ZOOM = 12;

/** Zoom level once a field-drawing map is centred on a real location. */
export const FIELD_DRAW_ZOOM = 16;

const CACHE_PREFIX = "geo_zip_";

type CachedEntry = { lat: number; lon: number; cachedAt: string };

function cacheKey(postalCode: number): string {
  return `${CACHE_PREFIX}${postalCode}`;
}

function readCache(postalCode: number): LatLon | null {
  try {
    const raw = localStorage.getItem(cacheKey(postalCode));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry;
    if (typeof entry.lat !== "number" || typeof entry.lon !== "number") return null;
    return { lat: entry.lat, lon: entry.lon };
  } catch {
    // Privacy mode / storage disabled / corrupt entry — treat as a cache miss.
    return null;
  }
}

function writeCache(postalCode: number, latLon: LatLon) {
  try {
    const entry: CachedEntry = { ...latLon, cachedAt: new Date().toISOString() };
    localStorage.setItem(cacheKey(postalCode), JSON.stringify(entry));
  } catch {
    // Non-fatal: we just re-geocode next time.
  }
}

/**
 * Resolve a German postal code to a centre point. Cache-first; on a cache
 * miss, issues exactly one Nominatim request. Never throws — any failure
 * (network error, non-2xx, empty result, malformed JSON) resolves to
 * FALLBACK_CENTER so the map always has somewhere sensible to show.
 */
export async function geocodePostalCode(postalCode: number): Promise<LatLon> {
  if (!Number.isInteger(postalCode) || postalCode <= 0) {
    return FALLBACK_CENTER;
  }

  const cached = readCache(postalCode);
  if (cached) return cached;

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("postalcode", String(postalCode));
    url.searchParams.set("countrycodes", "de");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString());
    if (!res.ok) {
      if (import.meta.env.DEV) {
        // Nominatim commonly 403s from localhost (no meaningful Referer sent
        // from a dev origin) — expected in dev, not a bug in this code.
        console.warn(`geocodePostalCode: Nominatim responded ${res.status}`);
      }
      return FALLBACK_CENTER;
    }

    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = results[0];
    if (!first) {
      return FALLBACK_CENTER;
    }

    const latLon: LatLon = { lat: Number(first.lat), lon: Number(first.lon) };
    if (!Number.isFinite(latLon.lat) || !Number.isFinite(latLon.lon)) {
      return FALLBACK_CENTER;
    }

    writeCache(postalCode, latLon);
    return latLon;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("geocodePostalCode: request failed", err);
    }
    return FALLBACK_CENTER;
  }
}
