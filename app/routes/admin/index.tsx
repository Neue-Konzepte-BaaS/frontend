import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/index";
import { getStatistics } from "~/lib/admin";
import { AccountTypeNotice } from "~/components/account-type-notice";
import { StatTile } from "~/components/admin/stat-tile";
import { useAdminSystemItems } from "~/lib/nav-items";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("admin:overviewMetaTitle") }];
}

/**
 * The admin's landing page: the platform at a glance. Everything that used to
 * share this screen (crop catalog, broadcast) now has its own page — see
 * issue #25. One statistics call, no other requests.
 */
export async function clientLoader() {
  const stats = await getStatistics();
  return { stats };
}

export default function AdminOverview({ loaderData }: Route.ComponentProps) {
  const { stats } = loaderData;
  const { t, i18n: i18nInstance } = useTranslation("admin");
  const systemItems = useAdminSystemItems();

  const locale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const num = (value: number, maximumFractionDigits = 0) => value.toLocaleString(locale, { maximumFractionDigits });
  const generatedAt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(stats.generatedAt),
  );

  // `accounts` is only present on the platform-scoped payload (an admin's);
  // the farm-scoped one a farmer gets omits it — see ~/lib/admin.ts.
  const accounts = stats.accounts;

  return (
    <main className="mx-auto max-w-5xl p-4">
      <AccountTypeNotice />

      <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        {stats.scope === "platform" ? t("scopePlatform") : t("scopeFarm")}
      </p>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("overviewTitle")}</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500">{t("generatedAt", { time: generatedAt })}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts && (
          // No "+N this month" sub-line: `registeredLast30Days` counts every new
          // account, not farmers specifically — flagged as a backend follow-up
          // rather than guessed at.
          <StatTile label={t("statFarms")} value={num(accounts.farmers)} />
        )}
        <StatTile
          label={t("statFields")}
          value={num(stats.fields.total)}
          detail={t("statFieldsDetail", {
            perFarm: accounts && accounts.farmers > 0 ? num(stats.fields.total / accounts.farmers, 1) : "–",
            area: num(stats.fields.areaSquareMeters),
          })}
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
          detail={t("statRentalsDetail", {
            active: num(stats.rentals.active),
            last30: num(stats.rentals.last30Days),
          })}
        />
        {accounts && (
          <StatTile
            label={t("statAccounts")}
            value={num(accounts.total)}
            detail={t("statAccountsDetail", {
              farmers: num(accounts.farmers),
              customers: num(accounts.customers),
              registered: num(accounts.registeredLast30Days),
            })}
          />
        )}
      </div>

      {/* The System tools also live in the sidebar, but the mobile bottom bar
          has no slot for Broadcast (five items max) — these cards are how it
          stays reachable on a phone. */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("systemTitle")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {systemItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
              >
                <Icon className="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
                <span className="font-medium text-gray-900 dark:text-white">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
