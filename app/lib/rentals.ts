import { apiClient } from "~/lib/api-client";
import type { Crop, Plot } from "~/lib/fields";
import type { PolygonGeometry } from "~/lib/geo";

export type { Crop } from "~/lib/fields";

/**
 * Plot search + rental API wrappers. See backend/openapi.yml for the
 * authoritative contract:
 *
 *   GET  /api/plots/nearest          -> NearbyPlot[]     (public, no auth)
 *   GET  /api/rentals                -> RentalWithPlot[] (customer only)
 *   GET  /api/rentals/farm           -> FarmRental[]     (farmer only)
 *   POST /api/rentals/{id}/approve   -> Rental           (farmer only)
 *   POST /api/rentals/{id}/decline   -> Rental           (farmer only)
 *
 * A rental starts life "requested" and a farmer decides it into "approved"
 * or "declined" exactly once — see RentalStatus. There is deliberately no
 * `rentPlot`/`POST /api/rentals` wrapper here: a rental is only ever created
 * as the result of a paid request (see ~/lib/payments.ts's
 * createCheckoutSession, which replaced it) — the customer is charged via
 * Stripe Checkout before a "requested" rental exists at all. Declining a
 * rental refunds that charge server-side (see backend's `DeclineRental`);
 * approving does nothing payment-related, since the charge already
 * happened at checkout time. Neither the charged amount nor a payment
 * status is exposed on `Rental` itself — that detail lives only on the
 * backend's internal `rental_checkout` record, not on any endpoint this
 * module calls.
 *
 * Unlike fields.ts, these endpoints use camelCase JSON keys (`plotId`,
 * `startAt`, `endAt`, `distanceMeters`) rather than the rest of the API's
 * snake_case/flat-lowercase convention — a real inconsistency in the
 * backend, not a frontend choice. The types below are already camelCase
 * (TypeScript's native convention) so no mapping layer is needed the way
 * auth.ts needs one for its snake_case boundary; the wire shape and the
 * TS shape happen to already match here.
 */

/**
 * A crop offering on a specific plot: the crop itself plus the total price
 * to rent this plot for that crop's fixed duration. `priceCents` is
 * computed server-side (from the plot's own base rate and the farm's
 * per-crop rate, both set by the farmer) — the frontend only ever displays
 * it, never computes or trusts a price of its own. A plot only offers a
 * crop here once the farmer has priced both halves; an offered-but-unpriced
 * crop simply doesn't appear in `crops` at all (see NearbyPlot below).
 */
export type PlotCropOffering = Crop & { priceCents: number };

export type NearbyPlot = {
  id: string;
  name: string;
  /** Id of the field this plot belongs to. */
  field: string;
  /** Id of the plot's farm — see farms.ts's getFarm, and /search/farms/:farmId. */
  farm: string;
  coordinates: PolygonGeometry;
  /** The plot's area in square meters, computed geodesically from its boundary. */
  areaSquareMeters: number;
  /** Distance from the search point to the plot's centroid, in meters. */
  distanceMeters: number;
  /** The priced, rentable crop offerings for this plot — the valid choices for `createCheckoutSession`. */
  crops: PlotCropOffering[];
};

/** A rental starts Requested, and a farmer decides it into Approved or Declined exactly once. */
export type RentalStatus = "requested" | "approved" | "declined";

export type Rental = {
  id: string;
  plotId: string;
  cropId: string;
  /** ISO 8601. Parse with `new Date(...)` at render time. */
  startAt: string;
  /** ISO 8601, exclusive. */
  endAt: string;
  status: RentalStatus;
  /** The customer's message to the farmer, submitted with the request. */
  message: string;
  /** ISO 8601, or null while still `requested`. */
  decidedAt: string | null;
};

export type RentalWithPlot = Rental & { plot: Plot; crop: Crop };

export type FarmRentalCustomer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type FarmRental = Rental & { plot: Plot; fieldName: string; customer: FarmRentalCustomer };

/**
 * One farm near the search point, aggregated from its nearby plots. Just the
 * id/distance/count — the farm's name and other details come from a separate
 * getFarm(farmId) call (see farms.ts); the nearest-plots endpoint only
 * carries the farm id per plot, not its name.
 */
export type NearbyFarm = {
  farmId: string;
  /** Distance to this farm's nearest plot, in meters. */
  distanceMeters: number;
  /** How many of this farm's plots are in the search results. */
  plotCount: number;
};

/**
 * Groups nearby plots by farm, for a farmer-centric results list (see issue:
 * search should surface farms, not a flat plot list — the plot-level detail
 * lives on each farm's own page, /search/farms/:farmId). `plots` must already
 * be sorted nearest-first (as findNearestPlots returns them); the result
 * keeps that order via each farm's nearest plot.
 */
export function groupPlotsByFarm(plots: NearbyPlot[]): NearbyFarm[] {
  const byFarm = new Map<string, NearbyFarm>();
  for (const plot of plots) {
    const farm = byFarm.get(plot.farm);
    if (farm) {
      farm.plotCount += 1;
    } else {
      byFarm.set(plot.farm, { farmId: plot.farm, distanceMeters: plot.distanceMeters, plotCount: 1 });
    }
  }
  return [...byFarm.values()];
}

/** `farm` restricts the results to that one farm's free plots. */
export type NearestPlotsQuery = (
  | { lat: number; lon: number }
  | { postalCode: string }
  | { city: string }
) & { limit?: number; farm?: string };

/** The API's maximum page size for the nearest-plots search. */
export const MAX_NEAREST_PLOTS = 100;

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
  if (query.farm) {
    params.set("farm", query.farm);
  }
  return apiClient.get<NearbyPlot[]>(`/plots/nearest?${params.toString()}`);
}

/** The authenticated customer's own rentals, newest first, expired included. */
export function listMyRentals(): Promise<RentalWithPlot[]> {
  return apiClient.get<RentalWithPlot[]>("/rentals");
}

/**
 * Every rental on the authenticated farmer's own plots, active and historic,
 * newest first, each with the plot and the renting customer. Customer-only
 * fields elsewhere (email) are visible here because this is the farmer
 * looking at their own tenants, not a public listing.
 */
export function listFarmRentals(): Promise<FarmRental[]> {
  return apiClient.get<FarmRental[]>("/rentals/farm");
}

/**
 * Approves a still-requested rental on one of the authenticated farmer's own
 * plots. The response is the bare Rental (no plot/customer/field) — callers
 * already have that detail from the request they're deciding, so use it for
 * confirmation only, not to repopulate a row. Throws ApiError(403) if the
 * farmer doesn't own the plot, ApiError(409) if the rental was already
 * decided (including by a concurrent request elsewhere).
 */
export function approveRental(rentalId: string): Promise<Rental> {
  return apiClient.post<Rental>(`/rentals/${rentalId}/approve`);
}

/**
 * Declines a still-requested rental on one of the authenticated farmer's own
 * plots, freeing the plot for that period. Same response shape and error
 * cases as approveRental.
 */
export function declineRental(rentalId: string): Promise<Rental> {
  return apiClient.post<Rental>(`/rentals/${rentalId}/decline`);
}

/**
 * Keeps only approved rentals covering right now, keyed by plot —
 * listFarmRentals returns historic and still-requested ones too, and a plot
 * can only have one *active* rental at a time (the backend rejects
 * overlapping periods, requested or approved alike). Used by the farmer's
 * own fields pages so they can show which of their plots are currently
 * occupied, and by whom, before the farmer edits crops or regenerates a plot
 * grid. A still-requested rental doesn't occupy the plot yet — see
 * RentalStatus — so it's excluded here same as the backend's own statistics.
 */
export function activeRentalsByPlot(rentals: FarmRental[]): Map<string, FarmRental> {
  const now = Date.now();
  const byPlot = new Map<string, FarmRental>();
  for (const rental of rentals) {
    if (
      rental.status === "approved" &&
      new Date(rental.startAt).getTime() <= now &&
      now < new Date(rental.endAt).getTime()
    ) {
      byPlot.set(rental.plotId, rental);
    }
  }
  return byPlot;
}
