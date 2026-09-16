import { apiClient } from "~/lib/api-client";
import type { PolygonGeometry } from "~/lib/geo";

/**
 * Field/plot API wrappers, mirroring auth.ts's shape. See backend/openapi.yml
 * for the authoritative contract:
 *
 *   GET  /api/fields                    -> FieldWithPlots[]
 *   POST /api/fields                    -> Field
 *   POST /api/fields/{fieldID}/plots    -> Plot
 *   GET  /api/crops                     -> Crop[]          (public, no auth)
 *   PUT  /api/plots/{plotID}/crops      -> Crop[]
 *
 * Unlike auth.ts, no camelCase<->snake_case mapping is needed: the backend
 * already uses flat lowercase JSON keys (id, name, farm, field,
 * coordinates, plots) that match these types directly.
 */

export type Field = {
  id: string;
  name: string;
  /** Id of the farm this field belongs to. */
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
};

/**
 * A crop in the catalog. Renting a plot books it for `durationMonths`
 * starting immediately — see rentals.ts's `rentPlot`.
 */
export type Crop = {
  id: string;
  name: string;
  durationMonths: number;
};

export type PlotWithCrops = Plot & { crops: Crop[] };

export type FieldWithPlots = Field & { plots: PlotWithCrops[] };

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
 * Replaces the full set of crops the plot offers, returning that set after
 * the update. The plot's field must be owned by the authenticated farmer.
 */
export function setPlotCrops(plotId: string, cropIds: string[]): Promise<Crop[]> {
  return apiClient.put<Crop[]>(`/plots/${plotId}/crops`, { cropIds });
}
