import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import type { Route } from "./+types/fields";
import { requireRole } from "~/lib/guards";
import { listFields } from "~/lib/fields";
import { geocodePostalCode } from "~/lib/geocode";
import { activeRentalsByPlot, listFarmRentals } from "~/lib/rentals";
import { FieldMap, type MapShape } from "~/components/map/field-map";
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

export default function FieldsList({ loaderData }: Route.ComponentProps) {
  const { fields, center, farmRentals } = loaderData;
  const { t } = useTranslation("farmer");
  const rentalByPlot = activeRentalsByPlot(farmRentals);

  const shapes: MapShape[] = fields.flatMap((field) => [
    { id: field.id, polygon: field.coordinates, variant: "field" as const },
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("yourFieldsTitle")}</h1>

      {fields.length === 0 ? (
        <p className="mt-6 text-gray-600 dark:text-gray-300">{t("noFieldsYet")}</p>
      ) : (
        <>
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <FieldMap center={center} shapes={shapes} drawMode={null} fitTo={fitTo} />
          </div>

          <ul className="mt-6 divide-y divide-gray-200 dark:divide-gray-800">
            {fields.map((field) => (
              <li key={field.id}>
                <Link
                  to={`/farmer/fields/${field.id}`}
                  className="block py-4 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{field.name}</p>
                    <span className="flex shrink-0 items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      {t("editPlots")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{t("plot", { count: field.plots.length })}</p>
                  {field.plots.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-sm text-gray-500">
                      {field.plots.map((plot) => {
                        const rental = rentalByPlot.get(plot.id);
                        return (
                          <li key={plot.id}>
                            {plot.name}
                            {rental && (
                              <span className="text-rose-600 dark:text-rose-400">
                                {" — "}
                                {t("rentedTo", { name: `${rental.customer.firstName} ${rental.customer.lastName}` })}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

// Note: the create flow (planner.tsx) always ends with navigate("/farmer/fields"),
// which re-runs this clientLoader fresh — no manual revalidation is needed for
// that path. If a create action is ever added directly on this route (e.g. a
// future inline "add plot"), use useRevalidator():
//   const revalidator = useRevalidator();
//   await createPlot(...);
//   revalidator.revalidate();
