import { apiClient } from "~/lib/api-client";
import type { Crop } from "~/lib/fields";

/**
 * The weekly care guide (backend #44). See backend/openapi.yml for the
 * authoritative contract:
 *
 *   GET    /api/care-guide                          -> PlotCareGuide[]   (customer only)
 *   GET    /api/crops/{cropId}/care-instructions    -> CareInstruction[] (admin or farmer)
 *   POST   /api/crops/{cropId}/care-instructions    -> CareInstruction   (admin only)
 *   PUT    /api/care-instructions/{id}              -> CareInstruction   (admin only)
 *   DELETE /api/care-instructions/{id}              -> 204               (admin only)
 *
 * The JSON is camelCase — checked against the handlers, not assumed (see
 * architecture.md on the backend's inconsistent casing), so no mapping layer.
 *
 * **`week` is a week of the tenant's own rental, not a calendar week.** Week 1
 * is a rental's first seven days, so two tenants growing the same crop from
 * different start dates are each told the right thing for where *they* are.
 * `currentWeek`/`totalWeeks` come from the backend, computed against the
 * database clock — don't recompute them here from `startAt`, the two clocks
 * are not the same one.
 */

export type CareInstruction = {
  id: string;
  cropId: string;
  /** Week of the rental, counting from 1. Never a calendar week. */
  week: number;
  title: string;
  body: string;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
};

export type PlotCareGuide = {
  rentalId: string;
  plotId: string;
  plotName: string;
  fieldName: string;
  crop: Crop;
  /** ISO 8601. */
  startAt: string;
  /** ISO 8601, exclusive. */
  endAt: string;
  /** The rental week today falls in, counting from 1. */
  currentWeek: number;
  /** How many weeks the rental runs, rounded up. */
  totalWeeks: number;
  /** The crop's guide in week order, already trimmed to weeks this rental reaches. */
  instructions: CareInstruction[];
};

export type CareInstructionInput = {
  week: number;
  title: string;
  body: string;
};

/**
 * The authenticated customer's care guide: one entry per plot they are renting
 * *right now*. A plot whose rental has ended — or has not started — is not in
 * the response at all, so a caller holding a rental must handle its absence
 * rather than treating it as an error.
 */
export function listCareGuide(): Promise<PlotCareGuide[]> {
  return apiClient.get<PlotCareGuide[]>("/care-guide");
}

/** One crop's whole guide, in week order. Admin (authoring) or farmer (preview). */
export function listCareInstructions(cropId: string): Promise<CareInstruction[]> {
  return apiClient.get<CareInstruction[]>(`/crops/${cropId}/care-instructions`);
}

/** Adds one task to a crop's guide. Admin only. */
export function createCareInstruction(cropId: string, input: CareInstructionInput): Promise<CareInstruction> {
  return apiClient.post<CareInstruction>(`/crops/${cropId}/care-instructions`, input);
}

/** Rewrites one task. The crop is not editable — that would be a different guide. */
export function updateCareInstruction(id: string, input: CareInstructionInput): Promise<CareInstruction> {
  return apiClient.put<CareInstruction>(`/care-instructions/${id}`, input);
}

/** Removes one task. Deleting an id that is already gone throws ApiError(404). */
export function deleteCareInstruction(id: string): Promise<void> {
  return apiClient.delete<void>(`/care-instructions/${id}`);
}

/** The guide for one plot, or undefined when that plot has no running rental. */
export function careGuideForPlot(guides: PlotCareGuide[], plotId: string): PlotCareGuide | undefined {
  return guides.find((guide) => guide.plotId === plotId);
}

/**
 * Splits a guide into what to do now and what is still ahead. Weeks already
 * behind the tenant are dropped: the plot page shows the current week and the
 * tasks coming up (issue #33), not a backlog of things it is too late to do.
 */
export function splitInstructionsByWeek(
  instructions: CareInstruction[],
  currentWeek: number,
): { thisWeek: CareInstruction[]; upcoming: CareInstruction[] } {
  return {
    thisWeek: instructions.filter((instruction) => instruction.week === currentWeek),
    upcoming: instructions.filter((instruction) => instruction.week > currentWeek),
  };
}

/**
 * Where a rental sits in time. `readyToHarvest` is the last week of the
 * period, `seasonOver` anything past its (exclusive) end.
 *
 * This is derived from the rental period alone. The backend has no per-crop
 * growth state — nothing records that a plot was actually sown, or that a
 * farmer called it ripe (that is backend#33, "ready to harvest notification",
 * still open) — so this says where the *rental* stands, which is the only
 * thing the API actually knows. Don't present it as an observation of the
 * plot.
 */
export type CropStage = "upcoming" | "growing" | "readyToHarvest" | "seasonOver";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function cropStage(startAt: string, endAt: string, now: Date = new Date()): CropStage {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const at = now.getTime();

  if (at < start) return "upcoming";
  if (at >= end) return "seasonOver";
  if (end - at <= ONE_WEEK_MS) return "readyToHarvest";
  return "growing";
}

/**
 * ISO 8601 calendar week of a date — the "KW" a German tenant reads off a
 * wall calendar, which is what "expected harvest week" means on the plot page.
 * Note this is the one place a *calendar* week is wanted; a guide's own `week`
 * field never is.
 *
 * Thursday rule: the week containing the year's first Thursday is week 1.
 * Computed in UTC so a browser east or west of the date line doesn't land on
 * the neighbouring day.
 */
export function isoWeek(date: Date): number {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Shift to the Thursday of this week (getUTCDay: Sunday is 0, so map it to 7).
  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
  const yearStart = Date.UTC(target.getUTCFullYear(), 0, 1);
  return Math.ceil(((target.getTime() - yearStart) / 86_400_000 + 1) / 7);
}
