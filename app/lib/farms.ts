import { apiClient } from "~/lib/api-client";

/**
 * A farm's public details — what a customer sees after clicking a farm in
 * plot search results (see rentals.ts's NearbyPlot.farm) — and the farmer's
 * own view of it (backend #71):
 *
 *   GET /api/farms/{farmID} -> Farm (public, no auth)
 *   GET /api/farms/me       -> Farm (farmer only; the caller's own farm)
 *   PUT /api/farms/me       -> Farm (farmer only; full replacement of the editable fields)
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

/** What a farmer may change about their own farm. The area is derived from the plots. */
export type FarmUpdate = {
  name: string;
  address: string;
  description: string;
  /** `YYYY-MM-DD`, or null to clear it. */
  foundedAt: string | null;
};

/** The calling farmer's own farm. */
export function getMyFarm(): Promise<Farm> {
  return apiClient.get<Farm>("/farms/me");
}

/** Overwrites the calling farmer's farm details; returns the farm as read back. */
export function updateMyFarm(update: FarmUpdate): Promise<Farm> {
  return apiClient.put<Farm>("/farms/me", update);
}

/** Mirrors the backend's bounds, so most mistakes are caught before a round trip. */
export const FARM_NAME_MAX = 100;
export const FARM_ADDRESS_MAX = 200;
export const FARM_DESCRIPTION_MAX = 2000;

export type FarmUpdateProblem = "nameRequired" | "addressRequired" | "foundedInFuture";

/**
 * Trims a farm form into the request body, or names the first problem with
 * it. Lengths are enforced by the inputs' `maxLength`, so only what an input
 * can't express is checked here. `today` is a `YYYY-MM-DD` string, so the
 * comparison is between calendar dates, not instants.
 */
export function toFarmUpdate(
  form: { name: string; address: string; description: string; foundedAt: string },
  today: string,
): { update: FarmUpdate } | { problem: FarmUpdateProblem } {
  const name = form.name.trim();
  const address = form.address.trim();
  const foundedAt = form.foundedAt.trim();
  if (!name) return { problem: "nameRequired" };
  if (!address) return { problem: "addressRequired" };
  if (foundedAt && foundedAt > today) return { problem: "foundedInFuture" };
  return { update: { name, address, description: form.description.trim(), foundedAt: foundedAt || null } };
}
