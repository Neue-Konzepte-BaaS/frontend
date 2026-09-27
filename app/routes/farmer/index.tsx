import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Sprout } from "lucide-react";
import type { Route } from "./+types/index";
import { requireRole } from "~/lib/guards";
import { getStatistics } from "~/lib/admin";
import { listFields, type FieldWithPlots } from "~/lib/fields";
import { earliestPendingRequest, listFarmRentals, type FarmRental } from "~/lib/rentals";
import { plotStatusesByPlot } from "~/lib/plots";
import { AccountTypeNotice } from "~/components/account-type-notice";
import { StatTile } from "~/components/admin/stat-tile";
import { primaryButtonClass } from "~/components/form";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:dashboardMetaTitle") }];
}

export async function clientLoader() {
  await requireRole("farmer");
  const [stats, fields, farmRentals] = await Promise.all([getStatistics(), listFields(), listFarmRentals()]);
  return { stats, fields, farmRentals };
}

/** How many of a field's own plots are currently rented, out of its total. */
function fieldOccupancy(field: FieldWithPlots, farmRentals: FarmRental[]): { total: number; rented: number } {
  const statuses = plotStatusesByPlot(
    field.plots.map((p) => p.id),
    farmRentals,
  );
  const rented = [...statuses.values()].filter((s) => s.status === "rented").length;
  return { total: field.plots.length, rented };
}

/**
 * The farmer's "Today" landing page (issue #18): the primary thing to do
 * right now (mark a crop ripe), what needs a decision (open requests), and
 * an at-a-glance read on occupancy across the farm's fields. Everything
 * shown here comes from data the API already exposes — see getStatistics
 * (farm-scoped for a farmer, same call the admin overview uses) and
 * listFarmRentals; there is no farm-wide "season" concept on the backend
 * yet, so this doesn't invent one.
 */
export default function FarmerDashboard({ loaderData }: Route.ComponentProps) {
  const { stats, fields, farmRentals } = loaderData;
  const { t, i18n: i18nInstance } = useTranslation(["farmer", "common"]);
  const dateLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const dateFormatter = new Intl.DateTimeFormat(dateLocale, { day: "2-digit", month: "short", year: "numeric" });

  const requestCount = farmRentals.filter((rental) => rental.status === "requested").length;
  const nextRequest = earliestPendingRequest(farmRentals);

  return (
    <main className="mx-auto max-w-3xl p-4">
      <AccountTypeNotice />
      <h1 className="text-2xl font-bold text-forest">{t("farmer:dashboardTitle")}</h1>

      <Link to="/farmer/board#ripeness" className={`${primaryButtonClass} mt-6 flex items-center justify-center gap-2`}>
        <Sprout className="h-5 w-5" aria-hidden />
        {t("farmer:markRipe")}
      </Link>

      {requestCount > 0 && (
        <Link
          to="/farmer/requests"
          className="mt-4 block rounded-lg border border-beige bg-cream p-4 hover:bg-beige/30"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-wide text-warm-olive uppercase">{t("farmer:needsYouLabel")}</p>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-deep-olive text-xs font-semibold text-ivory">
              {requestCount}
            </span>
          </div>
          <p className="mt-1 font-semibold text-forest">{t("farmer:requestsWaiting", { count: requestCount })}</p>
          {nextRequest && (
            <p className="mt-1 text-sm text-warm-olive">
              {t("farmer:requestsStartsOn", { date: dateFormatter.format(new Date(nextRequest.startAt)) })}
              {" · "}
              {nextRequest.fieldName}
            </p>
          )}
        </Link>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4">
        <StatTile label={t("common:plotStatusRented")} value={`${stats.plots.rented} / ${stats.plots.total}`} />
        <StatTile label={t("common:plotStatusFree")} value={String(stats.plots.available)} />
      </div>

      <section className="mt-8">
        <h2 className="text-xs font-semibold tracking-wide text-warm-olive uppercase">{t("farmer:yourFieldsTitle")}</h2>
        {fields.length === 0 ? (
          <p className="mt-3 text-wood">{t("farmer:noFieldsYet")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-beige">
            {fields.map((field) => {
              const { total, rented } = fieldOccupancy(field, farmRentals);
              const occupancy = total > 0 ? Math.round((rented / total) * 100) : 0;
              return (
                <li key={field.id}>
                  <Link
                    to={`/farmer/fields/${field.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-cream"
                  >
                    <div>
                      <p className="font-semibold text-forest">{field.name}</p>
                      <p className="text-sm text-warm-olive">
                        {t("farmer:plot", { count: total })} · {t("farmer:fieldRentedCount", { rented })}
                      </p>
                    </div>
                    {total > 0 && (
                      <span className="shrink-0 rounded-full bg-beige px-2.5 py-0.5 text-xs font-medium text-wood">
                        {occupancy}%
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
