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
 * Still-requested rentals aren't tenants yet — they belong in the /farmer/requests
 * queue (issue #36) until approved, so they're filtered out before this runs
 * (see filteredRows below). A declined rental never occupied the plot in the
 * first place and is likewise excluded — only approved rentals become tenants.
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
  rented: "bg-rose-50 text-rose-700",
  past: "bg-cream text-wood",
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
  // each status the API's own newest-first order survives. Only approved
  // rentals are tenants; requested ones live in /farmer/requests instead,
  // and declined ones never occupied the plot.
  const rows = farmRentals
    .filter((rental) => rental.status === "approved")
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
          <p className="text-xs font-semibold tracking-wide text-warm-olive uppercase">
            {t("tenantsActiveSummary", { count: activeCount })} · {t("field", { count: fields.length })}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-forest">{t("tenantsTitle")}</h1>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("tenantsSearchPlaceholder")}
          aria-label={t("tenantsSearchPlaceholder")}
          className="w-full rounded-full border border-beige px-4 py-2 text-sm text-forest focus:border-moss focus:ring-2 focus:ring-moss focus:outline-none lg:w-64"
        />
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-wood">{t("noTenantsYet")}</p>
      ) : filteredRows.length === 0 ? (
        <p className="mt-8 text-wood">{t("noTenantsMatchSearch")}</p>
      ) : (
        <>
          {/* Desktop: a real table. Held off until lg — with the sidebar already
              taking md:w-56 at md, a table's six columns get cramped before
              then, especially with longer German labels. */}
          <div className="mt-6 hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-beige text-xs tracking-wide text-warm-olive uppercase">
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
              <tbody className="divide-y divide-beige">
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 pr-4 font-semibold text-forest">{row.name}</td>
                    <td className="py-3 pr-4 text-wood">{row.plotName}</td>
                    <td className="py-3 pr-4 text-wood">{row.fieldName}</td>
                    <td className="py-3 pr-4 text-wood">{periodLabel(row)}</td>
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
                        className="font-medium text-moss hover:underline"
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
          <ul className="mt-6 divide-y divide-beige lg:hidden">
            {filteredRows.map((row) => (
              <li key={row.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-forest">{row.name}</p>
                    <p className="mt-1 text-sm text-warm-olive">
                      {row.plotName} · {row.fieldName}
                    </p>
                    <p className="mt-1 text-sm text-warm-olive">{periodLabel(row)}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPillClass[row.status]}`}
                  >
                    {statusLabel[row.status]}
                  </span>
                </div>
                <Link
                  to={`/farmer/fields/${row.fieldId}`}
                  className="mt-2 inline-block text-sm font-medium text-moss hover:underline"
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
