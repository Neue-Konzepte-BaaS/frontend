import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/home";
import { listMyRentals, type RentalStatus } from "~/lib/rentals";
import { PlotCard, formatRentalPeriod } from "~/components/plot-card";
import { AccountTypeNotice } from "~/components/account-type-notice";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("search:customerMetaTitle") }];
}

/**
 * The tenant's "Home" — their own rentals. Plot search moved to its own tab
 * (/search, shared with the public page) once the nav grew a dedicated
 * Search destination — see issue #27.
 */
export async function clientLoader() {
  const rentals = await listMyRentals();
  return { rentals };
}

export default function CustomerHome({ loaderData }: Route.ComponentProps) {
  const { rentals } = loaderData;
  const { t, i18n: i18nInstance } = useTranslation(["search", "customer", "common"]);
  const dateLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const statusLabel: Record<RentalStatus, string> = {
    requested: t("search:statusRequested"),
    approved: t("search:booked"),
    declined: t("search:statusDeclined"),
  };

  return (
    <main className="mx-auto max-w-5xl p-4">
      <AccountTypeNotice />
      <h1 className="text-2xl font-bold text-forest">{t("search:customerTitle")}</h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-forest">{t("search:myRentals")}</h2>
        {rentals.length === 0 ? (
          <p className="mt-2 text-wood">
            {t("search:noRentalsYet")}{" "}
            <Link to="/search" className="font-medium text-moss hover:underline">
              {t("customer:findAPlot")}
            </Link>
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-beige">
            {rentals.map((rental) => (
              <PlotCard
                key={rental.id}
                name={rental.plot.name}
                meta={`${rental.crop.name} · ${formatRentalPeriod(rental.startAt, rental.endAt, dateLocale)}`}
                action={<span className="text-sm text-warm-olive">{statusLabel[rental.status]}</span>}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
