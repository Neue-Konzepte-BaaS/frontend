import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/admin";
import { requireRole } from "~/lib/guards";
import { getStatistics, listCrops, type Statistics } from "~/lib/admin";
import { LogoutButton } from "~/components/logout-button";
import { LanguageSwitcher } from "~/components/language-switcher";
import { StatCard, StatRow } from "~/components/admin/stat-card";
import { BroadcastSection } from "~/components/admin/broadcast-section";
import { CropSection } from "~/components/admin/crop-section";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("admin:dashboardTitle") + " · BaaS" }];
}

export async function clientLoader() {
  const account = await requireRole("admin");
  const [stats, crops] = await Promise.all([getStatistics(), listCrops()]);
  return { account, stats, crops };
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  const [stats] = useState<Statistics>(loaderData.stats);
  const { t, i18n: i18nInstance } = useTranslation("admin");

  const dateLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const generatedAt = new Intl.DateTimeFormat(dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(stats.generatedAt));

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <Link to="/" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
            BaaS
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <p className="hidden font-mono text-xs text-gray-400 sm:block dark:text-gray-500">{account.id}</p>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("dashboardTitle")}</h1>

        {/* Statistics */}
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("statisticsTitle")}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t("generatedAt", { time: generatedAt })}</p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t("statFields")}>
              <StatRow label={t("statTotal")} value={stats.fields.total} />
              <StatRow label={t("statArea")} value={stats.fields.areaSquareMeters.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} />
            </StatCard>

            <StatCard title={t("statPlots")}>
              <StatRow label={t("statTotal")} value={stats.plots.total} />
              <StatRow label={t("statRented")} value={stats.plots.rented} />
              <StatRow label={t("statAvailable")} value={stats.plots.available} />
              <StatRow
                label={t("statOccupancy")}
                value={(stats.plots.occupancyRate * 100).toLocaleString(dateLocale, { maximumFractionDigits: 1 }) + " %"}
              />
            </StatCard>

            <StatCard title={t("statRentals")}>
              <StatRow label={t("statTotal")} value={stats.rentals.total} />
              <StatRow label={t("statActive")} value={stats.rentals.active} />
              <StatRow label={t("statLast30Days")} value={stats.rentals.last30Days} />
            </StatCard>

            {stats.accounts && (
              <StatCard title={t("statAccounts")}>
                <StatRow label={t("statTotal")} value={stats.accounts.total} />
                <StatRow label={t("statFarmers")} value={stats.accounts.farmers} />
                <StatRow label={t("statCustomers")} value={stats.accounts.customers} />
                <StatRow label={t("statRegisteredLast30")} value={stats.accounts.registeredLast30Days} />
              </StatCard>
            )}
          </div>
        </section>

        {/* Notification broadcast */}
        <BroadcastSection />

        {/* Crop catalog */}
        <CropSection initialCrops={loaderData.crops} />
      </main>
    </div>
  );
}
