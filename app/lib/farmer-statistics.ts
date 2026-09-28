import type { FarmRental } from "~/lib/rentals";
import type { FieldWithPlots } from "~/lib/fields";

/**
 * Client-side breakdowns for the farmer's statistics page (issue #22).
 * `GET /api/statistics` (`~/lib/admin.ts`'s `getStatistics`) already covers
 * the headline totals — fields, plots, rentals, occupancy — scoped to the
 * caller's own farm. These breakdowns aren't in that payload, so they're
 * computed here from the same two calls `farmer/tenants.tsx` already makes:
 * `listFarmRentals()` and `listFields()`.
 */

export type RequestFunnel = { requested: number; approved: number; declined: number };

export function requestFunnel(rentals: FarmRental[]): RequestFunnel {
  return {
    requested: rentals.filter((r) => r.status === "requested").length,
    approved: rentals.filter((r) => r.status === "approved").length,
    declined: rentals.filter((r) => r.status === "declined").length,
  };
}

export type CropCount = { cropName: string; count: number };

/** cropId -> name, from the crops each plot offers — FarmRental only carries cropId, not the crop itself. */
function cropNamesById(fields: FieldWithPlots[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const field of fields) {
    for (const plot of field.plots) {
      for (const crop of plot.crops) {
        names.set(crop.id, crop.name);
      }
    }
  }
  return names;
}

/**
 * Rentals grouped by crop, most-rented first. Every rental that was ever
 * approved or is still pending counts — a declined one never occupied a
 * plot. A cropId with no matching plot today (e.g. the crop was later
 * dropped from every plot) falls back to the raw id rather than disappearing.
 */
export function rentalsByCrop(rentals: FarmRental[], fields: FieldWithPlots[]): CropCount[] {
  const names = cropNamesById(fields);
  const counts = new Map<string, number>();
  for (const rental of rentals) {
    if (rental.status === "declined") continue;
    const name = names.get(rental.cropId) ?? rental.cropId;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()].map(([cropName, count]) => ({ cropName, count })).sort((a, b) => b.count - a.count);
}

export type FieldOccupancy = { fieldName: string; rented: number; total: number };

/**
 * Rented vs. total plots per field, right now — same "approved and covers
 * today" test as `~/lib/rentals.ts`'s `activeRentalsByPlot`, so this agrees
 * with what the Tenants/Requests pages already call "active". `total: 0` for
 * a field with no plots yet; callers must not divide by it directly.
 */
export function occupancyByField(fields: FieldWithPlots[], rentals: FarmRental[], now: Date = new Date()): FieldOccupancy[] {
  const at = now.getTime();
  const activePlotIds = new Set(
    rentals
      .filter((r) => r.status === "approved" && new Date(r.startAt).getTime() <= at && at < new Date(r.endAt).getTime())
      .map((r) => r.plotId),
  );
  return fields.map((field) => ({
    fieldName: field.name,
    rented: field.plots.filter((plot) => activePlotIds.has(plot.id)).length,
    total: field.plots.length,
  }));
}

/** Approved rentals that haven't started yet — the near-term pipeline, distinct from "active now". */
export function upcomingStarts(rentals: FarmRental[], now: Date = new Date()): number {
  return rentals.filter((r) => r.status === "approved" && new Date(r.startAt).getTime() > now.getTime()).length;
}
