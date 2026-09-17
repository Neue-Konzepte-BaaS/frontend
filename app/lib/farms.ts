import { apiClient } from "~/lib/api-client";

/**
 * A farm's public details — what a customer sees after clicking a farm in
 * plot search results (see rentals.ts's NearbyPlot.farm).
 *
 *   GET /api/farms/{farmID} -> Farm (public, no auth)
 *
 * There is no endpoint to list a farm's own plots directly; the farm detail
 * page instead re-runs the same nearby-plots search and filters to this
 * farm's id — see search/farm.tsx.
 */
export type Farm = {
  id: string;
  farmerId: string;
  name: string;
  address: string;
  description: string;
  /** ISO 8601 date (no time component), or null if not set. */
  foundedAt: string | null;
  /** Total area of every plot across every field of this farm, in square meters. */
  totalSquareMeters: number;
};

/** Throws ApiError(404, "farm not found") if farmId doesn't exist. */
export function getFarm(farmId: string): Promise<Farm> {
  return apiClient.get<Farm>(`/farms/${farmId}`);
}
