import { apiClient } from "~/lib/api-client";

/**
 * Farm API wrapper. See backend/openapi.yml for the authoritative contract:
 *
 *   GET /api/farms/{farmID}  -> Farm  (public, no auth)
 */

export type Farm = {
  id: string;
  farmerId: string;
  name: string;
  address: string;
  description: string;
  /** ISO 8601 date, or null if not set. */
  foundedAt: string | null;
  totalSquareMeters: number;
};

/** Public details of the farm with the given id — the `farm` field on `Field`/`NearbyPlot`. */
export function getFarm(farmId: string): Promise<Farm> {
  return apiClient.get<Farm>(`/farms/${farmId}`);
}
