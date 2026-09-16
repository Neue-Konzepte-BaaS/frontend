import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/fields";
import { requireRole } from "~/lib/guards";
import { listFields } from "~/lib/fields";
import { geocodePostalCode } from "~/lib/geocode";
import { FieldMap, type MapShape } from "~/components/map/field-map";
import { toBbox, unionBbox } from "~/lib/geo";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:fieldsListMetaTitle") }];
}

export async function clientLoader() {
  const account = await requireRole("farmer");
  const [fields, center] = await Promise.all([
    listFields(),
    geocodePostalCode(account.postalCode),
  ]);
  return { fields, center };
}

export default function FieldsList({ loaderData }: Route.ComponentProps) {
  const { fields, center } = loaderData;
  const { t } = useTranslation("farmer");

  const shapes: MapShape[] = fields.flatMap((field) => [
    { id: field.id, polygon: field.coordinates, variant: "field" as const },
    ...field.plots.map((plot) => ({ id: plot.id, polygon: plot.coordinates, variant: "plot" as const })),
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
                  <p className="font-semibold text-gray-900 dark:text-white">{field.name}</p>
                  <p className="text-sm text-gray-500">
                    {t("plot", { count: field.plots.length })}
                    {field.plots.length > 0 && ": " + field.plots.map((p) => p.name).join(", ")}
                  </p>
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
