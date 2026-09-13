import { Link } from "react-router";
import type { Route } from "./+types/fields";
import { requireRole } from "~/lib/guards";
import { listFields } from "~/lib/fields";
import { geocodePostalCode } from "~/lib/geocode";
import { FieldMap, type MapShape } from "~/components/map/field-map";
import { toBbox, unionBbox } from "~/lib/geo";
import { submitClass } from "~/components/form";

export function meta() {
  return [{ title: "Your fields · BaaS" }];
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

  const shapes: MapShape[] = fields.flatMap((field) => [
    { id: field.id, polygon: field.coordinates, variant: "field" as const },
    ...field.plots.map((plot) => ({ id: plot.id, polygon: plot.coordinates, variant: "plot" as const })),
  ]);

  const fitTo = unionBbox(fields.map((f) => toBbox(f.coordinates)));

  return (
    <main className="mx-auto max-w-5xl p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your fields</h1>
        <Link to="/farmer/fields/new" className={`${submitClass} inline-block w-auto px-4 py-2 text-sm`}>
          Add a field
        </Link>
      </div>

      {fields.length === 0 ? (
        <p className="mt-6 text-gray-600 dark:text-gray-300">
          No fields yet — draw your first one.
        </p>
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
                    {field.plots.length} {field.plots.length === 1 ? "plot" : "plots"}
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

// Note: the create flow (new-field.tsx) always ends with navigate("/farmer/fields"),
// which re-runs this clientLoader fresh — no manual revalidation is needed for
// that path. If a create action is ever added directly on this route (e.g. a
// future inline "add plot"), use useRevalidator():
//   const revalidator = useRevalidator();
//   await createPlot(...);
//   revalidator.revalidate();
