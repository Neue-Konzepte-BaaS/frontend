import { apiClient } from "~/lib/api-client";
import type { Crop, Plot } from "~/lib/fields";
import type { PolygonGeometry } from "~/lib/geo";

export type { Crop } from "~/lib/fields";

/**
 * Plot search + rental API wrappers. See backend/openapi.yml for the
 * authoritative contract:
 *
 *   GET  /api/plots/nearest   -> NearbyPlot[]     (public, no auth)
 *   POST /api/rentals         -> Rental           (customer only)
 *   GET  /api/rentals         -> RentalWithPlot[] (customer only)
 *
 * Unlike fields.ts, these endpoints use camelCase JSON keys (`plotId`,
 * `startAt`, `endAt`, `distanceMeters`) rather than the rest of the API's
 * snake_case/flat-lowercase convention — a real inconsistency in the
 * backend, not a frontend choice. The types below are already camelCase
 * (TypeScript's native convention) so no mapping layer is needed the way
 * auth.ts needs one for its snake_case boundary; the wire shape and the
 * TS shape happen to already match here.
 */

export type NearbyPlot = {
  id: string;
  name: string;
  /** Id of the field this plot belongs to. */
  field: string;
  /** Id of the farm this plot belongs to; also the id used by getFarm. */
  farm: string;
  coordinates: PolygonGeometry;
  /** Distance from the search point to the plot's centroid, in meters. */
  distanceMeters: number;
  /** The crops this plot's field currently offers — the valid choices for `rentPlot`. */
  crops: Crop[];
};

export type Rental = {
  id: string;
  plotId: string;
  cropId: string;
  /** ISO 8601. Parse with `new Date(...)` at render time. */
  startAt: string;
  /** ISO 8601, exclusive. */
  endAt: string;
};

export type RentalWithPlot = Rental & { plot: Plot; crop: Crop };

export type NearestPlotsQuery =
  | { lat: number; lon: number; limit?: number }
  | { postalCode: string; limit?: number }
  | { city: string; limit?: number };

/**
 * Finds the plots nearest to a search point, nearest first. Already-rented
 * plots are excluded server-side. Throws ApiError(404, "no location found
 * for the given postal code or city") when postalCode/city doesn't resolve
 * — that's an expected, common outcome the caller should turn into a
 * friendly message, not a generic error.
 */
export function findNearestPlots(query: NearestPlotsQuery): Promise<NearbyPlot[]> {
  const params = new URLSearchParams();
  if ("lat" in query) {
    params.set("lat", String(query.lat));
    params.set("lon", String(query.lon));
  } else if ("postalCode" in query) {
    params.set("postalCode", query.postalCode);
  } else {
    params.set("city", query.city);
  }
  if (query.limit != null) {
    params.set("limit", String(query.limit));
  }
  return apiClient.get<NearbyPlot[]>(`/plots/nearest?${params.toString()}`);
}

/**
 * Books a plot for the authenticated customer with the given crop, starting
 * now for that crop's fixed duration. Throws ApiError(409, "plot is already
 * rented") on an overlapping booking — a real race (the backend enforces
 * this with a DB exclusion constraint) — or ApiError(409, "crop is not
 * offered by this plot's field") when the crop isn't one the plot's field
 * offers. Callers must handle both as expected outcomes, not generic errors.
 */
export function rentPlot(plotId: string, cropId: string): Promise<Rental> {
  return apiClient.post<Rental>("/rentals", { plotId, cropId });
}

/** The authenticated customer's own rentals, newest first, expired included. */
export function listMyRentals(): Promise<RentalWithPlot[]> {
  return apiClient.get<RentalWithPlot[]>("/rentals");
}
