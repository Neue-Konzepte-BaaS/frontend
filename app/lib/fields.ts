import { apiClient } from "~/lib/api-client";
import type { PolygonGeometry } from "~/lib/geo";

/**
 * Field/plot API wrappers, mirroring auth.ts's shape. See backend/openapi.yml
 * for the authoritative contract:
 *
 *   GET  /api/fields                    -> FieldWithPlots[]
 *   POST /api/fields                    -> Field
 *   POST /api/fields/{fieldID}/plots    -> Plot
 *
 * Unlike auth.ts, no camelCase<->snake_case mapping is needed: the backend
 * already uses flat lowercase JSON keys (id, name, farmer, field,
 * coordinates, plots) that match these types directly.
 */

export type Field = {
  id: string;
  name: string;
  /** Account id of the owning farmer. */
  farmer: string;
  coordinates: PolygonGeometry;
};

export type Plot = {
  id: string;
  name: string;
  /** Id of the parent field. */
  field: string;
  coordinates: PolygonGeometry;
};

export type FieldWithPlots = Field & { plots: Plot[] };

/**
 * All fields owned by the authenticated farmer, each with its plots. Returns
 * `[]` (never null) for a farmer with no fields yet.
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
