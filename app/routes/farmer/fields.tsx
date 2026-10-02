import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import type { Route } from "./+types/fields";
import { requireRole } from "~/lib/guards";
import { listFields, type FieldWithPlots } from "~/lib/fields";
import { geocodePostalCode } from "~/lib/geocode";
import { activeRentalsByPlot, listFarmRentals, type FarmRental } from "~/lib/rentals";
import { plotStatusesByPlot } from "~/lib/plots";
import { FieldMap, type MapShape } from "~/components/map/field-map";
import { formatArea } from "~/components/plot-card";
import { toBbox, unionBbox } from "~/lib/geo";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:fieldsListMetaTitle") }];
}

export async function clientLoader() {
  const account = await requireRole("farmer");
  const [fields, center, farmRentals] = await Promise.all([
    listFields(),
    geocodePostalCode(account.postalCode),
    listFarmRentals(),
  ]);
  return { fields, center, farmRentals };
}

/** A field's plots collapsed into counts per status, for the list's summary line. */
function summarizeField(field: FieldWithPlots, farmRentals: FarmRental[]) {
  const statuses = plotStatusesByPlot(
    field.plots.map((p) => p.id),
    farmRentals,
  );
  let rented = 0;
  let requested = 0;
  let free = 0;
  let areaSquareMeters = 0;
  for (const plot of field.plots) {
    areaSquareMeters += plot.areaSquareMeters;
    switch (statuses.get(plot.id)!.status) {
      case "rented":
        rented++;
        break;
      case "requested":
        requested++;
        break;
      default:
        free++;
    }
  }
  return { areaSquareMeters, rented, requested, free };
}

export default function FieldsList({ loaderData }: Route.ComponentProps) {
  const { fields, center, farmRentals } = loaderData;
  const { t, i18n: i18next } = useTranslation(["farmer", "common"]);
  const navigate = useNavigate();
  const locale = i18next.language.startsWith("de") ? "de-DE" : "en-GB";
  const rentalByPlot = activeRentalsByPlot(farmRentals);
  const [hoveredFieldId, setHoveredFieldId] = useState<string | null>(null);

  function openField(fieldId: string) {
    navigate(`/farmer/fields/${fieldId}`);
  }

  const shapes: MapShape[] = fields.flatMap((field) => [
    {
      id: field.id,
      polygon: field.coordinates,
      variant: "field" as const,
      selected: field.id === hoveredFieldId,
    },
    ...field.plots.map((plot) => {
      const rental = rentalByPlot.get(plot.id);
      return {
        id: plot.id,
        polygon: plot.coordinates,
        variant: "plot" as const,
        rented: Boolean(rental),
        label: rental ? `${rental.customer.firstName} ${rental.customer.lastName.charAt(0)}.` : undefined,
      };
    }),
  ]);

  const fitTo = unionBbox(fields.map((f) => toBbox(f.coordinates)));

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-3xl font-bold text-forest">{t("farmer:yourFieldsTitle")}</h1>

      {fields.length === 0 ? (
        <p className="mt-6 text-wood">{t("farmer:noFieldsYet")}</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="overflow-hidden rounded-lg border border-beige lg:sticky lg:top-4">
            <FieldMap
              center={center}
              shapes={shapes}
              drawMode={null}
              fitTo={fitTo}
              onShapeClick={openField}
              className="h-[50vh] w-full lg:h-[75vh]"
            />
          </div>

          <ul className="divide-y divide-beige lg:max-h-[75vh] lg:overflow-y-auto">
            {fields.map((field) => {
              const summary = summarizeField(field, farmRentals);
              return (
                <li key={field.id}>
                  <button
                    type="button"
                    onClick={() => openField(field.id)}
                    onMouseEnter={() => setHoveredFieldId(field.id)}
                    onMouseLeave={() => setHoveredFieldId((id) => (id === field.id ? null : id))}
                    onFocus={() => setHoveredFieldId(field.id)}
                    onBlur={() => setHoveredFieldId((id) => (id === field.id ? null : id))}
                    className={`block w-full py-4 text-left transition-colors ${
                      hoveredFieldId === field.id ? "bg-cream" : "hover:bg-cream"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-forest">{field.name}</p>
                      <ChevronRight className="h-4 w-4 shrink-0 text-warm-olive" aria-hidden />
                    </div>

                    <p className="mt-0.5 text-sm text-warm-olive">
                      {t("farmer:plot", { count: field.plots.length })}
                      {field.plots.length > 0 && ` · ${formatArea(summary.areaSquareMeters, locale)}`}
                    </p>

                    {field.plots.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {summary.rented > 0 && <StatusPill tone="rented" label={t("common:plotStatusRented")} count={summary.rented} />}
                        {summary.requested > 0 && (
                          <StatusPill tone="requested" label={t("common:plotStatusRequested")} count={summary.requested} />
                        )}
                        {summary.free > 0 && <StatusPill tone="free" label={t("common:plotStatusFree")} count={summary.free} />}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}

const PILL_CLASS: Record<"rented" | "requested" | "free", string> = {
  rented: "bg-rose-100 text-rose-900",
  requested: "bg-lime-100 text-lime-900",
  free: "bg-beige text-wood",
};

function StatusPill({ tone, label, count }: { tone: "rented" | "requested" | "free"; label: string; count: number }) {
  const { t } = useTranslation("common");
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PILL_CLASS[tone]}`}>
      {t("plotStatusCount", { label, count })}
    </span>
  );
}

// Note: the create flow (planner.tsx) always ends with navigate("/farmer/fields"),
// which re-runs this clientLoader fresh — no manual revalidation is needed for
// that path. If a create action is ever added directly on this route (e.g. a
// future inline "add plot"), use useRevalidator():
//   const revalidator = useRevalidator();
//   await createPlot(...);
//   revalidator.revalidate();
