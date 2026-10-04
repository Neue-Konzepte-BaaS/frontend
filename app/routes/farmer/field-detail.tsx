import { useEffect, useRef, useState } from "react";
import { redirect } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/field-detail";
import { requireRole } from "~/lib/guards";
import {
  listFields,
  listCrops,
  createPlot,
  setPlotCrops,
  getCropName,
  type Crop,
  type FieldWithPlots,
  type PlotWithCrops,
} from "~/lib/fields";
import { listFarmRentals } from "~/lib/rentals";
import { plotStatusesByPlot, sortPlotsNaturally } from "~/lib/plots";
import { ApiError } from "~/lib/api-client";
import { FieldMap, fitToPolygon, type MapShape } from "~/components/map/field-map";
import { Field as FormField, FormError, FormSuccess, inputClass, submitClass } from "~/components/form";
import { PlotGrid } from "~/components/plot-grid";
import { PlotDetailPanel, type SelectedPlot } from "~/components/farmer/plot-detail-panel";
import { ringToCorners, subdivideIntoGrid, rectangleEdgeLengthsMeters, toBbox, type PolygonGeometry } from "~/lib/geo";
import type { LatLon } from "~/lib/geocode";
import { formatArea } from "~/components/plot-card";
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
  // Euros, as typed — converted to cents on save. A plot's own €/m²/week
  // rate, applied to every currently-selected plot in one save alongside
  // the crop checklist below (see setPlotCrops). Crop *pricing* itself is a
  // separate, farm-wide setting on farmer/settings.tsx, not per plot.
  const [basePriceInput, setBasePriceInput] = useState("");
  const [savingCrops, setSavingCrops] = useState(false);
  const [cropsError, setCropsError] = useState<string | null>(null);
  const [cropsSaved, setCropsSaved] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation(["farmer", "common"]);
  const locale = i18n.language.startsWith("de") ? "de-DE" : "en-GB";

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

  // "Rows" and "columns" are otherwise meaningless without seeing which of
  // the field's two edges each one runs along — the field can be drawn at
  // any rotation, so there's no fixed "rows go top-to-bottom" convention to
  // rely on. Recomputing subdivideIntoGrid on every keystroke (pure client
  // math, no network) and drawing the result as preview tiles lets the
  // farmer just look at the map instead of guessing. Capped well below what
  // generatePlots itself would ever practically create, since an
  // in-progress "99999x99999" keystroke would otherwise briefly ask this to
  // build billions of polygons.
  const MAX_PREVIEW_CELLS = 400;
  const parsedRows = Number(rows);
  const parsedCols = Number(cols);
  const hasValidGridInput =
    Number.isInteger(parsedRows) && Number.isInteger(parsedCols) && parsedRows >= 1 && parsedCols >= 1;
  const gridTooLargeToPreview = hasValidGridInput && parsedRows * parsedCols > MAX_PREVIEW_CELLS;

  // Cheap (no polygon generation), so computed even when gridTooLargeToPreview
  // suppresses the map tiles — the area number is most useful exactly then.
  const { widthM, heightM } = rectangleEdgeLengthsMeters(ringToCorners(field.coordinates));
  const plotAreaSquareMeters = hasValidGridInput ? (widthM / parsedCols) * (heightM / parsedRows) : null;

  let previewCells: PolygonGeometry[] = [];
  if (!hasPlots && hasValidGridInput && !gridTooLargeToPreview) {
    try {
      previewCells = subdivideIntoGrid(ringToCorners(field.coordinates), parsedRows, parsedCols);
    } catch {
      previewCells = [];
    }
  }

  // Clicking a plot always adds/removes it from the selection, so picking
  // several plots for a bulk crop edit needs no separate "select several"
  // mode — a click just toggles that one plot.
  function handlePlotClick(plotId: string) {
    setCropsError(null);
    setCropsSaved(false);
    setSelectedPlotIds((prev) => {
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

  // Prefill the checkboxes (and the base-price input) with whatever the
  // selected plots already have in common, so selecting a single plot shows
  // exactly its current crops/price, and selecting several shows only what
  // they already share.
  useEffect(() => {
    if (selectedPlots.length === 0) {
      setSelectedCropIds(new Set());
      setBasePriceInput("");
      return;
    }
    const [first, ...rest] = selectedPlots;
    const common = first.crops
      .map((c) => c.id)
      .filter((id) => rest.every((p) => p.crops.some((c) => c.id === id)));
    setSelectedCropIds(new Set(common));

    const commonPrice = rest.every((p) => p.basePriceCentsPerSqmPerWeek === first.basePriceCentsPerSqmPerWeek)
      ? first.basePriceCentsPerSqmPerWeek
      : null;
    setBasePriceInput(commonPrice != null ? (commonPrice / 100).toString() : "");
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

    // The backend requires a positive base rate on every save, even one
    // that only changes which crops are offered (400s otherwise) — so this
    // is a hard requirement here too, not an optional "leave blank to skip
    // pricing" field.
    const euros = Number(basePriceInput);
    if (basePriceInput.trim() === "" || !Number.isFinite(euros) || euros <= 0) {
      setCropsError(t("farmer:invalidBasePrice"));
      return;
    }
    const basePriceCentsPerSqmPerWeek = Math.round(euros * 100);

    setSavingCrops(true);
    const cropIds = [...selectedCropIds];
    const updatedByPlot = new Map<string, PlotWithCrops>();
    let failure: string | null = null;

    // Sequential, same reasoning as handleGenerate: no bulk endpoint, and a
    // failure partway through should still keep the plots before it updated.
    for (const plot of selectedPlots) {
      try {
        updatedByPlot.set(plot.id, await setPlotCrops(plot.id, basePriceCentsPerSqmPerWeek, cropIds));
      } catch (err) {
        failure = err instanceof ApiError ? err.message : t("common:genericError");
        break;
      }
    }

    if (updatedByPlot.size > 0) {
      setField((prev) => ({
        ...prev,
        plots: prev.plots.map((p) => updatedByPlot.get(p.id) ?? p),
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
    ...previewCells.map((cell, i) => ({
      id: `preview-${i}`,
      polygon: cell,
      variant: "plot" as const,
      label: String(i + 1),
    })),
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
    // Before plots exist, the map only shows the field outline and the
    // rows/cols preview tiles — neither is clickable (the preview is a
    // read-only "here's what you'll get", not a selection).
    if (!hasPlots || id === field.id) return;
    handlePlotClick(id);
  }

  const selection: SelectedPlot[] = plots.flatMap((plot, i) =>
    selectedPlotIds.has(plot.id) ? [{ plot, number: i + 1, ...statuses.get(plot.id)! }] : [],
  );
  const cropNames = new Map<string, string>(catalog.map((c: Crop) => [c.id, getCropName(c, i18n.language)]));

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

  const toolbarButtonClass = "rounded-md px-2.5 py-1 text-sm font-medium text-wood hover:bg-cream";

  const cropEditor = (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-wood">{t("farmer:offeredCropsLabel")}</p>
        {catalog.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setCropsSaved(false);
              setSelectedCropIds(new Set(catalog.map((c: Crop) => c.id)));
            }}
            className={toolbarButtonClass}
          >
            {t("farmer:selectAllCrops")}
          </button>
        )}
      </div>

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

      <div className="mt-3">
        <FormField label={t("farmer:basePriceLabel")} htmlFor="basePrice">
          <input
            id="basePrice"
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            required
            placeholder={t("farmer:basePricePlaceholder")}
            value={basePriceInput}
            onChange={(e) => {
              setCropsSaved(false);
              setBasePriceInput(e.target.value);
            }}
            className={inputClass}
          />
        </FormField>
      </div>

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
                  {t("farmer:cropDuration", { name: getCropName(crop, i18n.language), months: crop.durationMonths })}
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={savingCrops || !basePriceInput.trim()}
            onClick={handleSaveCrops}
            className={`${submitClass} mt-4 px-4 py-2 text-sm`}
          >
            {savingCrops ? t("farmer:savingCrops") : t("farmer:saveCrops")}
          </button>
        </>
      )}
    </div>
  );

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-3xl font-bold text-forest">{field.name}</h1>
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
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={() => setSelection(plots.map((p) => p.id))} className={toolbarButtonClass}>
                {t("farmer:selectAll")}
              </button>
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
            <PlotDetailPanel selection={selection} cropNames={cropNames} cropEditor={cropEditor} />
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

          {hasValidGridInput && (
            <p className="text-sm text-warm-olive">
              {gridTooLargeToPreview
                ? t("farmer:gridPreviewTooLarge", {
                    max: MAX_PREVIEW_CELLS,
                    area: formatArea(plotAreaSquareMeters!, locale),
                  })
                : t("farmer:gridPreviewCount", {
                    rows: parsedRows,
                    cols: parsedCols,
                    count: parsedRows * parsedCols,
                    area: formatArea(plotAreaSquareMeters!, locale),
                  })}
            </p>
          )}

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
