import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/tenants";
import { requireRole } from "~/lib/guards";
import { listFarmRentals, type FarmRental } from "~/lib/rentals";
import { listFields } from "~/lib/fields";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:tenantsMetaTitle") }];
}

export async function clientLoader() {
  await requireRole("farmer");
  const [farmRentals, fields] = await Promise.all([listFarmRentals(), listFields()]);
  return { farmRentals, fields };
}

type TenantStatus = "rented" | "past";

type TenantRow = {
  id: string;
  name: string;
  plotName: string;
  fieldName: string;
  fieldId: string;
  startAt: string;
  endAt: string;
  status: TenantStatus;
};

/**
 * "Requested" (a rental pending farmer approval, with its own "Review"
 * action) is part of the target design but has no backend data yet — see
 * issue #36 (farmer request queue). Only the two statuses the API can
 * actually produce are modeled here; both use the same "Open" action, so
 * there's no branch to add once #36 lands, just a third status to fold in.
 */
function toTenantRow(rental: FarmRental): TenantRow {
  return {
    id: rental.id,
    name: `${rental.customer.firstName} ${rental.customer.lastName}`,
    plotName: rental.plot.name,
    fieldName: rental.fieldName,
    fieldId: rental.plot.field,
    startAt: rental.startAt,
    endAt: rental.endAt,
    status: new Date(rental.endAt).getTime() <= Date.now() ? "past" : "rented",
  };
}

const statusPillClass: Record<TenantStatus, string> = {
  rented: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  past: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

export default function TenantsList({ loaderData }: Route.ComponentProps) {
  const { farmRentals, fields } = loaderData;
  const [query, setQuery] = useState("");
  const { t, i18n: i18nInstance } = useTranslation("farmer");
  const numberLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const dateFormatter = new Intl.DateTimeFormat(numberLocale, { day: "2-digit", month: "short", year: "numeric" });

  const statusLabel: Record<TenantStatus, string> = {
    rented: t("statusRented"),
    past: t("statusPast"),
  };

  function periodLabel(row: TenantRow) {
    if (row.status === "past") {
      return t("tenantEndedOn", { date: dateFormatter.format(new Date(row.endAt)) });
    }
    return `${dateFormatter.format(new Date(row.startAt))} – ${dateFormatter.format(new Date(row.endAt))}`;
  }

  // Active tenants first — the ones a farmer is most likely checking on —
  // then past ones as a trailing record. Array#sort is stable, so within
  // each status the API's own newest-first order survives.
  const rows = farmRentals
    .map(toTenantRow)
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "rented" ? -1 : 1));
  const activeCount = rows.filter((row) => row.status === "rented").length;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = normalizedQuery
    ? rows.filter(
        (row) =>
          row.name.toLowerCase().includes(normalizedQuery) || row.plotName.toLowerCase().includes(normalizedQuery),
      )
    : rows;

  return (
    <main className="mx-auto max-w-5xl p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
            {t("tenantsActiveSummary", { count: activeCount })} · {t("field", { count: fields.length })}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{t("tenantsTitle")}</h1>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("tenantsSearchPlaceholder")}
          aria-label={t("tenantsSearchPlaceholder")}
          className="w-full rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none lg:w-64 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-gray-600 dark:text-gray-300">{t("noTenantsYet")}</p>
      ) : filteredRows.length === 0 ? (
        <p className="mt-8 text-gray-600 dark:text-gray-300">{t("noTenantsMatchSearch")}</p>
      ) : (
        <>
          {/* Desktop: a real table. Held off until lg — with the sidebar already
              taking md:w-56 at md, a table's six columns get cramped before
              then, especially with longer German labels. */}
          <div className="mt-6 hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs tracking-wide text-gray-500 uppercase dark:border-gray-800 dark:text-gray-400">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t("tenantsColTenant")}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t("tenantsColPlot")}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t("tenantsColField")}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t("tenantsColPeriod")}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t("tenantsColStatus")}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    <span className="sr-only">{t("tenantsColAction")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-white">{row.name}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{row.plotName}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{row.fieldName}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{periodLabel(row)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPillClass[row.status]}`}
                      >
                        {statusLabel[row.status]}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/farmer/fields/${row.fieldId}`}
                        className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {t("openAction")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Below lg: one card per tenant instead of a horizontally cramped table. */}
          <ul className="mt-6 divide-y divide-gray-200 lg:hidden dark:divide-gray-800">
            {filteredRows.map((row) => (
              <li key={row.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{row.name}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {row.plotName} · {row.fieldName}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{periodLabel(row)}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPillClass[row.status]}`}
                  >
                    {statusLabel[row.status]}
                  </span>
                </div>
                <Link
                  to={`/farmer/fields/${row.fieldId}`}
                  className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {t("openAction")} &rarr;
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
