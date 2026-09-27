import { apiClient } from "~/lib/api-client";
import type { PolygonGeometry } from "~/lib/geo";

/**
 * Field/plot API wrappers, mirroring auth.ts's shape. See backend/openapi.yml
 * for the authoritative contract:
 *
 *   GET  /api/fields               -> FieldWithPlots[]
 *   POST /api/fields               -> Field
 *   POST /api/fields/{fieldID}/plots -> Plot
 *   GET  /api/crops                -> Crop[]                       (public, no auth)
 *   PUT  /api/plots/{plotID}/crops -> PlotWithCrops
 *   GET  /api/farms/crop-rates     -> { rates: FarmCropRate[] }    (farmer only, own farm)
 *   PUT  /api/farms/crop-rates     -> { rates: FarmCropRate[] }    (farmer only, own farm)
 *
 * Unlike auth.ts, no camelCase<->snake_case mapping is needed: the backend
 * already uses flat lowercase JSON keys (id, name, farm, field,
 * coordinates, plots) that match these types directly.
 */

export type Field = {
  id: string;
  name: string;
  /** Id of the owning farm — see farms.ts. */
  farm: string;
  coordinates: PolygonGeometry;
};

export type Plot = {
  id: string;
  name: string;
  /** Id of the parent field. */
  field: string;
  coordinates: PolygonGeometry;
  /** The plot's area in square meters, computed geodesically from its boundary. */
  areaSquareMeters: number;
  /**
   * The farmer's own €/m²/week rate for this plot, set via setPlotCrops.
   * `null` until priced. Combined with a crop's farm-wide rate (see
   * FarmCropRate) to compute what a customer actually pays — see
   * rentals.ts's PlotCropOffering, which carries that computed total. This
   * raw rate is what the farmer edits directly in field-detail.tsx; it is
   * deliberately NOT pre-multiplied by area/duration here.
   */
  basePriceCentsPerSqmPerWeek: number | null;
};

/**
 * A crop in the catalog. Renting a plot books it for `durationMonths` once a
 * request is approved — see rentals.ts's RentalStatus and
 * ~/lib/payments.ts's createCheckoutSession (which starts a request).
 */
export type Crop = {
  id: string;
  name: string;
  durationMonths: number;
};

export type PlotWithCrops = Plot & { crops: Crop[] };

export type FieldWithPlots = Field & { plots: PlotWithCrops[] };

/** One crop's farm-wide €/m²/week rate, set once regardless of how many plots grow it. */
export type FarmCropRate = {
  cropId: string;
  priceCentsPerSqmPerWeek: number;
};

/**
 * All fields owned by the authenticated farmer, each with its plots and the
 * crops each plot offers. Returns `[]` (never null) for a farmer with no
 * fields yet.
 */
export function listFields(): Promise<FieldWithPlots[]> {
  return apiClient.get<FieldWithPlots[]>("/fields");
}

export function createField(input: { name: string; coordinates: PolygonGeometry }): Promise<Field> {
  return apiClient.post<Field>("/fields", input);
}

export function createPlot(
  fieldId: string,
  input: { name: string; coordinates: PolygonGeometry },
): Promise<Plot> {
  return apiClient.post<Plot>(`/fields/${fieldId}/plots`, input);
}

/** The full crop catalog, ordered by name. Public endpoint — no auth required. */
export function listCrops(): Promise<Crop[]> {
  return apiClient.get<Crop[]>("/crops");
}

/**
 * Replaces the full set of crops the plot offers and the plot's own base
 * rate, returning the updated plot (with its crops) after the save. The
 * plot's field must be owned by the authenticated farmer.
 *
 * `basePriceCentsPerSqmPerWeek` is the plot's own rate, not a per-crop
 * price — see Plot's own field — and, unlike reading it back, it's
 * REQUIRED here: the backend 400s with "basePriceCentsPerSqmPerWeek must be
 * positive" if it's not a positive number, even if the caller only means to
 * change which crops are offered. Callers must always supply the plot's
 * current (or a new) rate, not omit it — see field-detail.tsx's
 * `basePriceInput`, which is a required field on save, not optional.
 */
export function setPlotCrops(plotId: string, basePriceCentsPerSqmPerWeek: number, cropIds: string[]): Promise<PlotWithCrops> {
  return apiClient.put<PlotWithCrops>(`/plots/${plotId}/crops`, { basePriceCentsPerSqmPerWeek, cropIds });
}

/**
 * The authenticated farmer's own farm-wide crop rates — one €/m²/week rate
 * per crop, regardless of how many plots grow it (see FarmCropRate). A crop
 * not yet priced by this farmer simply doesn't appear in the result. Scoped
 * to the caller's own farm via the JWT (no farm id needed), same pattern as
 * rentals.ts's `listFarmRentals` (`GET /api/rentals/farm`).
 */
export async function getFarmCropRates(): Promise<FarmCropRate[]> {
  const { rates } = await apiClient.get<{ rates: FarmCropRate[] }>("/farms/crop-rates");
  return rates;
}

/**
 * Replaces the full set of the farmer's own crop rates. Full-replace, not a
 * diff — callers must submit every rate they want kept, not just the one
 * being changed (see farmer/settings.tsx, which always submits its whole
 * form via resolveCropRatesToSave below, never a hand-built array).
 */
export async function setFarmCropRates(rates: FarmCropRate[]): Promise<FarmCropRate[]> {
  const { rates: saved } = await apiClient.put<{ rates: FarmCropRate[] }>("/farms/crop-rates", { rates });
  return saved;
}

export type CropRatesToSave = { ok: true; rates: FarmCropRate[] } | { ok: false; invalidCrop: Crop };

/**
 * Turns the settings form's per-crop text inputs into the full array
 * `setFarmCropRates` needs to submit — the one place that has to reconcile
 * "what's typed" with "what's already saved" before a full-replace call.
 *
 * A blank input must NEVER delete an existing rate. Since setFarmCropRates
 * replaces the whole set, naively skipping blank inputs would wipe out any
 * crop the farmer simply didn't retype — whether because they only meant to
 * change one crop's rate, or just forgot. So a blank input falls back to
 * that crop's current rate from `existingRates` (if it has one); only a
 * crop that was never priced, and is still blank, is genuinely omitted —
 * there was nothing to lose there in the first place. There is currently no
 * way to actually remove a rate through this form; that would need an
 * explicit affordance (e.g. a "clear" button), not an empty text field.
 *
 * A non-blank input is still validated as a positive number — returning
 * `{ ok: false, invalidCrop }` on the first crop that fails, so the caller
 * can render a translated, crop-specific error message.
 */
export function resolveCropRatesToSave(catalog: Crop[], rateInputs: Map<string, string>, existingRates: FarmCropRate[]): CropRatesToSave {
  const existingByCropId = new Map(existingRates.map((r) => [r.cropId, r.priceCentsPerSqmPerWeek]));
  const rates: FarmCropRate[] = [];
  for (const crop of catalog) {
    const raw = (rateInputs.get(crop.id) ?? "").trim();
    if (raw === "") {
      const existing = existingByCropId.get(crop.id);
      if (existing != null) rates.push({ cropId: crop.id, priceCentsPerSqmPerWeek: existing });
      continue;
    }
    const euros = Number(raw);
    if (!Number.isFinite(euros) || euros <= 0) {
      return { ok: false, invalidCrop: crop };
    }
    rates.push({ cropId: crop.id, priceCentsPerSqmPerWeek: Math.round(euros * 100) });
  }
  return { ok: true, rates };
}
