import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Sprout } from "lucide-react";
import type { Route } from "./+types/index";
import { requireRole } from "~/lib/guards";
import { getMyFarm } from "~/lib/farms";
import { listFields } from "~/lib/fields";
import { activeRentalsByPlot, earliestPendingRequest, listFarmRentals } from "~/lib/rentals";
import { AccountTypeNotice } from "~/components/account-type-notice";
import { StatTile } from "~/components/stat-tile";
import { primaryButtonClass } from "~/components/form";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:dashboardMetaTitle") }];
}

export async function clientLoader() {
  await requireRole("farmer");
  const [farm, fields, farmRentals] = await Promise.all([
    getMyFarm(),
    listFields(),
    listFarmRentals(),
  ]);
  return { farm, fields, farmRentals };
}

/**
 * The farmer's "Today" landing page (issue #18): the primary action (mark a
 * crop ripe), what needs a decision (open requests), and occupancy at a glance.
 */
export default function FarmerDashboard({ loaderData }: Route.ComponentProps) {
  const { farm, fields, farmRentals } = loaderData;
  const { t, i18n: i18nInstance } = useTranslation(["farmer", "common"]);
  const dateLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const dateFormatter = new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "short" });

  const requestCount = farmRentals.filter((rental) => rental.status === "requested").length;
  const nextRequest = earliestPendingRequest(farmRentals);
  // Tiles and field rows are both derived from this one snapshot (fields +
  // rentals) so they always add up. "Rented" is the backend's own definition
  // (GetFarmStatistics): an approved rental covering right now.
  const activeByPlot = activeRentalsByPlot(farmRentals);
  const rentedByField = new Map(
    fields.map((field) => [field.id, field.plots.filter((plot) => activeByPlot.has(plot.id)).length]),
  );
  const totalPlots = fields.reduce((sum, field) => sum + field.plots.length, 0);
  const rentedPlots = [...rentedByField.values()].reduce((sum, count) => sum + count, 0);

  return (
    <main className="mx-auto max-w-5xl p-4">
      <AccountTypeNotice />

      <p className="text-xs font-semibold tracking-wide text-warm-olive uppercase">{farm.name}</p>
      <h1 className="text-3xl font-bold text-forest">{t("farmer:dashboardTitle")}</h1>

      <Link
        to="/farmer/board#ripeness"
        className={`${primaryButtonClass} mt-6 flex items-center justify-center gap-2`}
      >
        <Sprout className="h-5 w-5" aria-hidden />
        {t("farmer:dashboardMarkRipe")}
      </Link>

      {requestCount > 0 && (
        <Link
          to="/farmer/requests"
          className="mt-4 block rounded-2xl border border-beige bg-cream p-5 shadow-sm hover:bg-beige/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-warm-olive uppercase">{t("farmer:needsYouLabel")}</p>
              <p className="mt-1 text-lg font-semibold text-forest">
                {t("farmer:requestsWaiting", { count: requestCount })}
              </p>
            </div>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-deep-olive text-sm font-semibold text-ivory">
              {requestCount}
            </span>
          </div>
          {nextRequest && (
            <p className="mt-2 text-sm text-warm-olive">
              {t("farmer:dashboardNextRequestStart", { date: dateFormatter.format(new Date(nextRequest.startAt)) })}
              {" · "}
              {nextRequest.fieldName}
            </p>
          )}
        </Link>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4">
        <StatTile label={t("common:plotStatusRented")} value={`${rentedPlots} / ${totalPlots}`} />
        <StatTile label={t("common:plotStatusFree")} value={String(totalPlots - rentedPlots)} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-forest">{t("farmer:yourFieldsTitle")}</h2>
        {fields.length === 0 ? (
          <p className="mt-3 text-wood">{t("farmer:noFieldsYet")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-beige rounded-2xl border border-beige bg-cream px-5 shadow-sm">
            {fields.map((field) => {
              const total = field.plots.length;
              const rented = rentedByField.get(field.id) ?? 0;
              const pct = total > 0 ? Math.round((rented / total) * 100) : 0;
              return (
                <li key={field.id}>
                  <Link to={`/farmer/fields/${field.id}`} className="flex items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-semibold text-forest">{field.name}</p>
                      <p className="text-sm text-warm-olive">
                        {t("farmer:plot", { count: total })} · {t("farmer:fieldRentedCount", { rented })}
                      </p>
                    </div>
                    {total > 0 && (
                      <span className="shrink-0 rounded-full bg-beige/60 px-2.5 py-0.5 text-sm font-medium text-wood">
                        {pct}%
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
