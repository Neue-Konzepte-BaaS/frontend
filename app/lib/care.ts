import { apiClient } from "~/lib/api-client";
import type { Crop } from "~/lib/fields";

/**
 * The weekly care guide (backend #44). See backend/openapi.yml for the
 * authoritative contract:
 *
 *   GET    /api/care-guide                          -> PlotCareGuide[]   (customer only)
 *   GET    /api/crops/{cropId}/care-instructions    -> CareInstruction[] (admin or farmer)
 *   POST   /api/crops/{cropId}/care-instructions    -> CareInstruction   (admin or farmer)
 *   PUT    /api/care-instructions/{id}              -> CareInstruction   (admin or farmer)
 *   DELETE /api/care-instructions/{id}              -> 204               (admin or farmer)
 *   DELETE /api/crops/{cropId}/farm-care-guide      -> 204               (farmer only)
 *
 * **Default guide and farm versions (backend #68).** An admin maintains one
 * default guide per crop, which every farm starts from. A farmer's first write
 * for a crop copies that default into a version of their own farm, and from
 * then on their tenants read only the farm's version. Two consequences for a
 * farmer's client:
 *
 * - Editing or deleting a *default* step (the id the farmer was shown) changes
 *   the farm's copy of it, so the response carries a **different id** — and
 *   every other step of the guide now has a new id too. Reload the guide after
 *   a farmer's write rather than patching the list in place.
 * - The farm's version may be empty, which a body alone can't tell apart from
 *   an empty default; `listCareInstructions` reads the backend's
 *   `X-Care-Guide-Source` header for that.
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
  /** `null` for a step of the default guide; the farm's id for a step of that farm's own version. */
  farmId: string | null;
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

/** Which version of a crop's guide an editor is looking at. */
export type CareGuideSource = "default" | "farm";

/** One crop's guide as an editor sees it. */
export type CropCareGuide = {
  source: CareGuideSource;
  /** In week order. */
  instructions: CareInstruction[];
};

/**
 * Reads which version a guide is from the `X-Care-Guide-Source` header. A
 * missing or unknown header (an older backend, or a proxy stripping it) falls
 * back to the steps themselves: any step with a `farmId` is the farm's.
 */
export function careGuideSource(header: string | null, instructions: CareInstruction[]): CareGuideSource {
  if (header === "farm" || header === "default") return header;
  return instructions.some((instruction) => instruction.farmId !== null) ? "farm" : "default";
}

/**
 * One crop's whole guide, in week order: the default for an admin, and for a
 * farmer the version their tenants read.
 */
export async function listCareInstructions(cropId: string): Promise<CropCareGuide> {
  const { data, headers } = await apiClient.getWithHeaders<CareInstruction[]>(`/crops/${cropId}/care-instructions`);
  return { source: careGuideSource(headers.get("X-Care-Guide-Source"), data), instructions: data };
}

/**
 * Adds one task to a crop's guide: the default for an admin, the farm's own
 * version for a farmer (taking the guide over first if need be).
 */
export function createCareInstruction(cropId: string, input: CareInstructionInput): Promise<CareInstruction> {
  return apiClient.post<CareInstruction>(`/crops/${cropId}/care-instructions`, input);
}

/**
 * Rewrites one task. The crop is not editable — that would be a different
 * guide. For a farmer editing a default step, the result is the farm's copy,
 * with a different id.
 */
export function updateCareInstruction(id: string, input: CareInstructionInput): Promise<CareInstruction> {
  return apiClient.put<CareInstruction>(`/care-instructions/${id}`, input);
}

/** Removes one task. Deleting an id that is already gone throws ApiError(404). */
export function deleteCareInstruction(id: string): Promise<void> {
  return apiClient.delete<void>(`/care-instructions/${id}`);
}

/**
 * Drops the farmer's own version of a crop's guide, so their tenants read the
 * default again. Farmer only; throws ApiError(404) if there is nothing to reset.
 */
export function resetFarmCareGuide(cropId: string): Promise<void> {
  return apiClient.delete<void>(`/crops/${cropId}/farm-care-guide`);
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
