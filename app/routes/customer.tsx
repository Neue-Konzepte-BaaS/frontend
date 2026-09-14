import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/customer";
import { resolveOptionalRole } from "~/lib/guards";
import { listMyRentals, type RentalWithPlot } from "~/lib/rentals";
import { PlotSearch } from "~/components/plot-search";
import { PlotCard } from "~/components/plot-card";
import { submitClass } from "~/components/form";
import { LogoutButton } from "~/components/logout-button";
import { LanguageSwitcher } from "~/components/language-switcher";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("search:customerMetaTitle") }];
}

/**
 * The customer's dashboard: the same plot search the public /search page
 * offers (shared via <PlotSearch />), plus their own rentals underneath.
 *
 * Still uses resolveOptionalRole rather than requireRole so an anonymous
 * visitor with a stale cookie renders logged-out instead of being bounced —
 * /customer is in PUBLIC_PATHS for that reason. A wrong-role visitor is
 * redirected to their own dashboard; a farmer who wants to browse plots has
 * /search for that.
 */
export async function clientLoader() {
  const account = await resolveOptionalRole("customer");
  const rentals = account ? await listMyRentals() : [];
  return { account, rentals };
}

export default function CustomerPage({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  const [rentals, setRentals] = useState<RentalWithPlot[]>(loaderData.rentals);
  const { t, i18n: i18nInstance } = useTranslation(["search", "common"]);
  const dateLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <Link to="/" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
            {t("common:brand")}
          </Link>
          {account ? (
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <p className="hidden font-mono text-xs text-gray-400 sm:block dark:text-gray-500">{account.id}</p>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link
                to="/login?redirect=/customer"
                className="whitespace-nowrap text-sm font-medium text-gray-700 hover:underline dark:text-gray-200"
              >
                {t("common:signIn")}
              </Link>
              <Link to="/register?redirect=/customer" className={`${submitClass} inline-block w-auto px-4 py-2 text-sm`}>
                {t("common:createAccount")}
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("search:customerTitle")}</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">{t("search:searchSubtitle")}</p>

        <PlotSearch
          account={account}
          rentedPlotIds={new Set(rentals.map((r) => r.plotId))}
          onRented={(plot, rental) =>
            setRentals((prev) => [
              // NearbyPlot carries every Plot field (id, name, field,
              // coordinates) plus distanceMeters, so the rented plot can be
              // folded into a RentalWithPlot without another round trip.
              { ...rental, plot: { id: plot.id, name: plot.name, field: plot.field, coordinates: plot.coordinates } },
              ...prev,
            ])
          }
          loginRedirectTo="/customer"
        />

        {account && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("search:myRentals")}</h2>
            {rentals.length === 0 ? (
              <p className="mt-2 text-gray-600 dark:text-gray-300">{t("search:noRentalsYet")}</p>
            ) : (
              <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800">
                {rentals.map((rental) => (
                  <PlotCard
                    key={rental.id}
                    name={rental.plot.name}
                    meta={formatRentalPeriod(rental.startAt, rental.endAt, dateLocale)}
                    action={<span className="text-sm text-gray-500">{t("search:booked")}</span>}
                  />
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function formatRentalPeriod(startAt: string, endAt: string, locale: string): string {
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" });
  return `${dateFormatter.format(new Date(startAt))} – ${dateFormatter.format(new Date(endAt))}`;
}
