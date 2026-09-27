import { useTranslation } from "react-i18next";
import type { Route } from "./+types/statistics";
import { requireRole } from "~/lib/guards";
import { getStatistics } from "~/lib/admin";
import { listFarmRentals } from "~/lib/rentals";
import { listFields } from "~/lib/fields";
import { occupancyByField, rentalsByCrop, requestFunnel, upcomingStarts } from "~/lib/farmer-statistics";
import { StatTile } from "~/components/stat-tile";
import { AccountTypeNotice } from "~/components/account-type-notice";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:statisticsMetaTitle") }];
}

/**
 * The farmer's own numbers (issue #22). `GET /api/statistics` already scopes
 * itself to the caller's farm (backend#40's farmer half is done, `~/lib/admin.ts`
 * despite the name is role-generic) and covers the headline tiles; the
 * breakdowns below it come from `~/lib/farmer-statistics.ts`, computed from
 * the same two calls `farmer/tenants.tsx` already makes.
 */
export async function clientLoader() {
  await requireRole("farmer");
  const [stats, farmRentals, fields] = await Promise.all([getStatistics(), listFarmRentals(), listFields()]);
  return { stats, farmRentals, fields };
}

export default function FarmerStatistics({ loaderData }: Route.ComponentProps) {
  const { stats, farmRentals, fields } = loaderData;
  const { t, i18n: i18nInstance } = useTranslation("farmer");
  const locale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const num = (value: number, maximumFractionDigits = 0) => value.toLocaleString(locale, { maximumFractionDigits });
  const generatedAt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(stats.generatedAt),
  );

  const funnel = requestFunnel(farmRentals);
  const byCrop = rentalsByCrop(farmRentals, fields);
  const byField = occupancyByField(fields, farmRentals);
  const upcoming = upcomingStarts(farmRentals);

  return (
    <main className="mx-auto max-w-5xl p-4">
      <AccountTypeNotice />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold text-forest">{t("statisticsTitle")}</h1>
        <p className="text-xs text-warm-olive">{t("statGeneratedAt", { time: generatedAt })}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label={t("statFields")}
          value={num(stats.fields.total)}
          detail={t("statFieldsDetail", { area: num(stats.fields.areaSquareMeters) })}
        />
        <StatTile
          label={t("statPlots")}
          value={num(stats.plots.total)}
          detail={t("statPlotsDetail", {
            rented: num(stats.plots.rented),
            occupancy: num(stats.plots.occupancyRate * 100, 1),
          })}
        />
        <StatTile
          label={t("statRentals")}
          value={num(stats.rentals.total)}
          detail={t("statRentalsDetail", { active: num(stats.rentals.active), last30: num(stats.rentals.last30Days) })}
        />
        <StatTile label={t("statUpcomingStarts")} value={num(upcoming)} />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-forest">{t("statRequestFunnel")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatTile label={t("statRequestsRequested")} value={num(funnel.requested)} />
          <StatTile label={t("statRequestsApproved")} value={num(funnel.approved)} />
          <StatTile label={t("statRequestsDeclined")} value={num(funnel.declined)} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-forest">{t("statByCrop")}</h2>
        {byCrop.length === 0 ? (
          <p className="mt-2 text-sm text-warm-olive">{t("statNoRentalsYet")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-beige rounded-2xl border border-beige bg-cream shadow-sm">
            {byCrop.map((row) => (
              <li key={row.cropName} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="font-medium text-forest">{row.cropName}</span>
                <span className="text-sm text-warm-olive">{num(row.count)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-forest">{t("statByField")}</h2>
        {byField.length === 0 ? (
          <p className="mt-2 text-sm text-warm-olive">{t("statNoFieldsYet")}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {byField.map((row) => {
              const pct = row.total > 0 ? Math.round((row.rented / row.total) * 100) : 0;
              return (
                <li key={row.fieldName} className="rounded-2xl border border-beige bg-cream px-5 py-4 shadow-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-medium text-forest">{row.fieldName}</span>
                    <span className="text-sm text-warm-olive">
                      {t("statFieldOccupancy", { rented: num(row.rented), total: num(row.total) })}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-beige/60">
                    <div className="h-full rounded-full bg-moss" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
