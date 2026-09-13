import { useState } from "react";
import { redirect } from "react-router";
import type { Route } from "./+types/field-detail";
import { requireRole } from "~/lib/guards";
import { listFields, createPlot, type FieldWithPlots } from "~/lib/fields";
import { ApiError } from "~/lib/api-client";
import { FieldMap, fitToPolygon, type MapShape } from "~/components/map/field-map";
import { Field as FormField, FormError, inputClass, submitClass } from "~/components/form";
import { ringToCorners, subdivideIntoGrid, toBbox } from "~/lib/geo";
import type { LatLon } from "~/lib/geocode";

export function meta() {
  return [{ title: "Field · BaaS" }];
}

/**
 * No GET /api/fields/{id} endpoint exists — GET /api/fields already returns
 * every field (with its plots) in one call, so this loads all of them and
 * picks the one the route asked for. Simpler than adding a backend endpoint
 * for what's still a small per-farmer list. If a farmer's field count ever
 * grows large enough for this to matter, that's the point to add one.
 */
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  await requireRole("farmer");
  const fields = await listFields();
  const field = fields.find((f) => f.id === params.fieldId);
  if (!field) {
    throw redirect("/farmer/fields");
  }
  return { field };
}

export default function FieldDetail({ loaderData }: Route.ComponentProps) {
  const [field, setField] = useState<FieldWithPlots>(loaderData.field);
  const [rows, setRows] = useState("");
  const [cols, setCols] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const hasPlots = field.plots.length > 0;

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const r = Number(rows);
    const c = Number(cols);
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 1 || c < 1) {
      setError("Rows and columns must both be whole numbers of at least 1.");
      return;
    }

    const cells = subdivideIntoGrid(ringToCorners(field.coordinates), r, c);
    setGenerating(true);
    setProgress({ done: 0, total: cells.length });

    // Sequential, not Promise.all: the backend has no batch-create endpoint,
    // and keeping this sequential means each plot's success/failure is
    // independent — a transient failure partway through still leaves every
    // plot before it saved, rather than an all-or-nothing race. There is no
    // rollback (no DELETE exists) if some later cell fails; whatever
    // succeeded stays, and the error below says plainly how far it got.
    let created = 0;
    for (let i = 0; i < cells.length; i++) {
      try {
        const plot = await createPlot(field.id, { name: `Plot ${i + 1}`, coordinates: cells[i] });
        created++;
        setField((prev) => ({ ...prev, plots: [...prev.plots, plot] }));
        setProgress({ done: created, total: cells.length });
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Something went wrong.";
        setError(
          `${message} — ${created} of ${cells.length} plots were created before this failed. ` +
            "The plots already created cannot be removed from here.",
        );
        break;
      }
    }
    setGenerating(false);
  }

  const mapShapes: MapShape[] = [
    { id: field.id, polygon: field.coordinates, variant: "field" as const },
    ...field.plots.map((p) => ({ id: p.id, polygon: p.coordinates, variant: "plot" as const })),
  ];

  // FieldMap requires an initial `center` before it can fitTo the field's
  // real bounds on the next tick — the bbox midpoint is good enough since
  // fitTo immediately takes over.
  const fieldBbox = toBbox(field.coordinates);
  const initialCenter: LatLon = {
    lat: (fieldBbox.minLat + fieldBbox.maxLat) / 2,
    lon: (fieldBbox.minLon + fieldBbox.maxLon) / 2,
  };

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{field.name}</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-300">
        {hasPlots
          ? `${field.plots.length} plot${field.plots.length === 1 ? "" : "s"}`
          : "This field has no plots yet."}
      </p>

      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <FieldMap
          center={initialCenter}
          shapes={mapShapes}
          drawMode={null}
          fitTo={fitToPolygon(field.coordinates)}
        />
      </div>

      {!hasPlots ? (
        <form onSubmit={handleGenerate} className="mt-4 max-w-sm space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Set how many rows and columns of equal-sized plots to lay out across this field. This can only be
            done once — there's no way to change it afterwards yet.
          </p>
          <div className="flex gap-4">
            <FormField label="Rows" htmlFor="rows">
              <input
                id="rows"
                type="number"
                min={1}
                step={1}
                required
                inputMode="numeric"
                value={rows}
                onChange={(e) => setRows(e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Columns" htmlFor="cols">
              <input
                id="cols"
                type="number"
                min={1}
                step={1}
                required
                inputMode="numeric"
                value={cols}
                onChange={(e) => setCols(e.target.value)}
                className={inputClass}
              />
            </FormField>
          </div>
          <button type="submit" disabled={generating} className={submitClass}>
            {generating && progress ? `Creating plot ${progress.done + 1} of ${progress.total}…` : "Generate plots"}
          </button>
        </form>
      ) : (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Plots</p>
          <ul className="mt-1 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            {field.plots.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
