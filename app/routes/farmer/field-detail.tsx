import { useEffect, useRef, useState } from "react";
import { redirect } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/field-detail";
import { requireRole } from "~/lib/guards";
import { listFields, listCrops, createPlot, setPlotCrops, type Crop, type FieldWithPlots } from "~/lib/fields";
import { listFarmRentals } from "~/lib/rentals";
import { plotStatusesByPlot, sortPlotsNaturally } from "~/lib/plots";
import { ApiError } from "~/lib/api-client";
import { FieldMap, fitToPolygon, type MapShape } from "~/components/map/field-map";
import { Field as FormField, FormError, FormSuccess, inputClass, submitClass } from "~/components/form";
import { PlotGrid } from "~/components/plot-grid";
import { PlotDetailPanel, type SelectedPlot } from "~/components/farmer/plot-detail-panel";
import { ringToCorners, subdivideIntoGrid, toBbox } from "~/lib/geo";
import type { LatLon } from "~/lib/geocode";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:fieldDetailMetaTitle") }];
}

/**
 * No GET /api/fields/{id} endpoint exists — GET /api/fields already returns
 * every field (with its plots) in one call, so this loads all of them and
 * picks the one the route asked for. Simpler than adding a backend endpoint
 * for what's still a small per-farmer list. If a farmer's field count ever
 * grows large enough for this to matter, that's the point to add one.
 *
 * The crop catalog is loaded alongside it — the field only carries the crops
 * it *already* offers, but the picker below needs every crop that exists to
 * offer as a choice.
 */
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  await requireRole("farmer");
  const [fields, catalog, farmRentals] = await Promise.all([listFields(), listCrops(), listFarmRentals()]);
  const field = fields.find((f) => f.id === params.fieldId);
  if (!field) {
    throw redirect("/farmer/fields");
  }
  return { field, catalog, farmRentals };
}

export default function FieldDetail({ loaderData }: Route.ComponentProps) {
  const { catalog, farmRentals } = loaderData;
  const [field, setField] = useState<FieldWithPlots>(loaderData.field);
  const [rows, setRows] = useState("");
  const [cols, setCols] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [selectedPlotIds, setSelectedPlotIds] = useState<Set<string>>(new Set());
  const [selectedCropIds, setSelectedCropIds] = useState<Set<string>>(new Set());
  const [savingCrops, setSavingCrops] = useState(false);
  const [cropsError, setCropsError] = useState<string | null>(null);
  const [cropsSaved, setCropsSaved] = useState(false);
  const [multiSelect, setMultiSelect] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation(["farmer", "common"]);

  const hasPlots = field.plots.length > 0;
  const plots = sortPlotsNaturally(field.plots);
  const statuses = plotStatusesByPlot(
    plots.map((p) => p.id),
    farmRentals,
  );

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const r = Number(rows);
    const c = Number(cols);
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 1 || c < 1) {
      setError(t("farmer:invalidRowsColumns"));
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
        setField((prev) => ({ ...prev, plots: [...prev.plots, { ...plot, crops: [] }] }));
        setProgress({ done: created, total: cells.length });
      } catch (err) {
        const message = err instanceof ApiError ? err.message : t("common:genericError");
        setError(t("farmer:plotGenerationFailed", { message, created, total: cells.length }));
        break;
      }
    }
    setGenerating(false);
  }

  // A click picks just that plot (click it again to deselect); in
  // multi-select mode clicks add/remove instead, for bulk crop edits.
  function handlePlotClick(plotId: string) {
    setCropsError(null);
    setCropsSaved(false);
    setSelectedPlotIds((prev) => {
      if (!multiSelect) {
        return prev.size === 1 && prev.has(plotId) ? new Set() : new Set([plotId]);
      }
      const next = new Set(prev);
      if (next.has(plotId)) {
        next.delete(plotId);
      } else {
        next.add(plotId);
      }
      return next;
    });
  }

  function setSelection(ids: string[]) {
    setCropsError(null);
    setCropsSaved(false);
    setSelectedPlotIds(new Set(ids));
  }

  function toggleCrop(cropId: string) {
    setSelectedCropIds((prev) => {
      const next = new Set(prev);
      if (next.has(cropId)) {
        next.delete(cropId);
      } else {
        next.add(cropId);
      }
      return next;
    });
  }

  const selectedPlots = plots.filter((p) => selectedPlotIds.has(p.id));
  // Re-key on the sorted id list (not the Set or selectedPlots itself) so this
  // only re-runs when *which* plots are selected changes — not on every field
  // update (e.g. right after handleSaveCrops writes the new crops back).
  const selectedPlotsKey = [...selectedPlotIds].sort().join(",");

  // Prefill the checkboxes with whatever the selected plots already offer in
  // common, so selecting a single plot shows exactly its current crops, and
  // selecting several shows only what they already share.
  useEffect(() => {
    if (selectedPlots.length === 0) {
      setSelectedCropIds(new Set());
      return;
    }
    const [first, ...rest] = selectedPlots;
    const common = first.crops
      .map((c) => c.id)
      .filter((id) => rest.every((p) => p.crops.some((c) => c.id === id)));
    setSelectedCropIds(new Set(common));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on selectedPlotsKey intentionally, see above.
  }, [selectedPlotsKey]);

  // On narrow screens the panel sits below the grid — bring it into view so
  // a click on the map visibly does something.
  useEffect(() => {
    if (selectedPlotIds.size > 0 && window.matchMedia("(max-width: 1023px)").matches) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on selection changes.
  }, [selectedPlotsKey]);

  async function handleSaveCrops() {
    setCropsError(null);
    setSavingCrops(true);

    const cropIds = [...selectedCropIds];
    const updatedByPlot = new Map<string, Crop[]>();
    let failure: string | null = null;

    // Sequential, same reasoning as handleGenerate: no bulk endpoint, and a
    // failure partway through should still keep the plots before it updated.
    for (const plot of selectedPlots) {
      try {
        updatedByPlot.set(plot.id, await setPlotCrops(plot.id, cropIds));
      } catch (err) {
        failure = err instanceof ApiError ? err.message : t("common:genericError");
        break;
      }
    }

    if (updatedByPlot.size > 0) {
      setField((prev) => ({
        ...prev,
        plots: prev.plots.map((p) => (updatedByPlot.has(p.id) ? { ...p, crops: updatedByPlot.get(p.id)! } : p)),
      }));
    }
    if (failure) {
      setCropsError(failure);
    } else {
      setCropsSaved(true);
    }
    setSavingCrops(false);
  }

  const mapShapes: MapShape[] = [
    { id: field.id, polygon: field.coordinates, variant: "field" as const },
    ...plots.map((p, i) => {
      const { status } = statuses.get(p.id)!;
      return {
        id: p.id,
        polygon: p.coordinates,
        variant: "plot" as const,
        label: String(i + 1),
        selected: selectedPlotIds.has(p.id),
        rented: status === "rented",
        requested: status === "requested",
      };
    }),
  ];

  function handleMapShapeClick(id: string) {
    if (id === field.id) return;
    handlePlotClick(id);
  }

  const selection: SelectedPlot[] = plots.flatMap((plot, i) =>
    selectedPlotIds.has(plot.id) ? [{ plot, number: i + 1, ...statuses.get(plot.id)! }] : [],
  );
  const cropNames = new Map<string, string>(catalog.map((c: Crop) => [c.id, c.name]));

  // FieldMap requires an initial `center` before it can fitTo the field's
  // real bounds on the next tick — the bbox midpoint is good enough since
  // fitTo immediately takes over.
  const fieldBbox = toBbox(field.coordinates);
  const initialCenter: LatLon = {
    lat: (fieldBbox.minLat + fieldBbox.maxLat) / 2,
    lon: (fieldBbox.minLon + fieldBbox.maxLon) / 2,
  };

  const map = (
    <div className="overflow-hidden rounded-lg border border-beige">
      <FieldMap
        center={initialCenter}
        shapes={mapShapes}
        drawMode={null}
        onShapeClick={handleMapShapeClick}
        fitTo={fitToPolygon(field.coordinates)}
      />
    </div>
  );

  const cropEditor = (
    <div>
      <p className="text-sm font-medium text-wood">{t("farmer:offeredCropsLabel")}</p>

      {cropsError && (
        <div className="mt-3">
          <FormError message={cropsError} />
        </div>
      )}
      {cropsSaved && (
        <div className="mt-3">
          <FormSuccess message={t("farmer:cropsSaved")} />
        </div>
      )}

      {catalog.length === 0 ? (
        <p className="mt-3 text-sm text-wood">{t("farmer:noCropsInCatalog")}</p>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {catalog.map((crop: Crop) => (
              <li key={crop.id}>
                <label className="flex items-center gap-2 text-sm text-wood">
                  <input
                    type="checkbox"
                    checked={selectedCropIds.has(crop.id)}
                    onChange={() => {
                      setCropsSaved(false);
                      toggleCrop(crop.id);
                    }}
                    className="h-4 w-4 rounded border-beige text-moss focus:ring-moss"
                  />
                  {t("farmer:cropDuration", { name: crop.name, months: crop.durationMonths })}
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={savingCrops}
            onClick={handleSaveCrops}
            className={`${submitClass} mt-4 px-4 py-2 text-sm`}
          >
            {savingCrops ? t("farmer:savingCrops") : t("farmer:saveCrops")}
          </button>
        </>
      )}
    </div>
  );

  const toolbarButtonClass = "rounded-md px-2.5 py-1 text-sm font-medium text-wood hover:bg-cream";

  return (
    <main className="mx-auto max-w-6xl p-4">
      <h1 className="text-2xl font-bold text-forest">{field.name}</h1>
      <p className="mt-1 text-wood">
        {hasPlots ? t("farmer:plot", { count: field.plots.length }) : t("farmer:fieldHasNoPlotsYet")}
      </p>

      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}

      {hasPlots ? (
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div>
            {map}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm text-wood">
                <input
                  type="checkbox"
                  checked={multiSelect}
                  onChange={(e) => setMultiSelect(e.target.checked)}
                  className="h-4 w-4 rounded border-beige text-moss focus:ring-moss"
                />
                {t("farmer:selectSeveral")}
              </label>
              {multiSelect && (
                <button type="button" onClick={() => setSelection(plots.map((p) => p.id))} className={toolbarButtonClass}>
                  {t("farmer:selectAll")}
                </button>
              )}
              {selectedPlotIds.size > 0 && (
                <button type="button" onClick={() => setSelection([])} className={toolbarButtonClass}>
                  {t("farmer:clearSelection")}
                </button>
              )}
            </div>
            <div className="mt-3">
              <PlotGrid
                plots={plots.map((p) => ({ id: p.id, status: statuses.get(p.id)!.status }))}
                selectedIds={selectedPlotIds}
                onSelect={handlePlotClick}
              />
            </div>
          </div>
          <div ref={panelRef} className="scroll-mt-4 lg:sticky lg:top-4">
            <PlotDetailPanel fieldId={field.id} selection={selection} cropNames={cropNames} cropEditor={cropEditor} />
          </div>
        </div>
      ) : (
        <div className="mt-4">{map}</div>
      )}

      {!hasPlots && (
        <form onSubmit={handleGenerate} className="mt-4 max-w-sm space-y-4">
          <p className="text-sm text-wood">{t("farmer:gridInstructions")}</p>
          <div className="flex gap-4">
            <FormField label={t("farmer:rowsLabel")} htmlFor="rows">
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
            <FormField label={t("farmer:columnsLabel")} htmlFor="cols">
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
            {generating && progress
              ? t("farmer:creatingPlotProgress", { done: progress.done + 1, total: progress.total })
              : t("farmer:generatePlots")}
          </button>
        </form>
      )}
    </main>
  );
}
