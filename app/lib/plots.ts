import type { Rental } from "~/lib/rentals";

export type PlotStatus = "rented" | "requested" | "free";

/**
 * Orders plots the way a person counts them ("Plot 2" before "Plot 10"),
 * not the way the backend's `ORDER BY name` does. Plots from different
 * fields stay grouped by field.
 */
export function sortPlotsNaturally<T extends { name: string; field: string }>(plots: T[]): T[] {
  return [...plots].sort(
    (a, b) => a.field.localeCompare(b.field) || a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
}

/**
 * Each plot's status plus the rental behind it, for color-coding the plot
 * grid. An approved rental that hasn't ended yet counts as rented even if
 * it starts in the future — the plot is already spoken for. A pending
 * request only counts when nothing is approved for that plot.
 */
export function plotStatusesByPlot<R extends Rental>(
  plotIds: string[],
  rentals: R[],
  now: number = Date.now(),
): Map<string, { status: PlotStatus; rental: R | null }> {
  const result = new Map<string, { status: PlotStatus; rental: R | null }>();
  for (const id of plotIds) result.set(id, { status: "free", rental: null });

  for (const rental of rentals) {
    const current = result.get(rental.plotId);
    if (!current || new Date(rental.endAt).getTime() <= now) continue;

    if (rental.status === "approved") {
      const earlier = current.status === "rented" && current.rental && current.rental.startAt < rental.startAt;
      if (!earlier) result.set(rental.plotId, { status: "rented", rental });
    } else if (rental.status === "requested" && current.status === "free") {
      result.set(rental.plotId, { status: "requested", rental });
    }
  }
  return result;
}
