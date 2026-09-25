import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/home";
import { listMyRentals, type RentalStatus } from "~/lib/rentals";
import { PlotCard, formatRentalPeriod } from "~/components/plot-card";
import { AccountTypeNotice } from "~/components/account-type-notice";
import i18n from "~/i18n";

const STATUS_LABEL_KEY = {
  requested: "search:statusRequested",
  approved: "search:booked",
  declined: "search:statusDeclined",
} as const satisfies Record<RentalStatus, string>;

const STATUS_BADGE_CLASS: Record<RentalStatus, string> = {
  requested: "bg-lime-100 text-lime-900",
  approved: "bg-rose-100 text-rose-900",
  declined: "bg-cream text-warm-olive",
};

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
                action={
                  /* Badge and link together: the status is what Home says
                     about the rental, the link is where the tenant acts on it.
                     Only an approved rental gets the link — a plot that is
                     still requested, or was declined, is not theirs to open,
                     and its plot page would have nothing to show but the
                     dates. */
                  <span className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[rental.status]}`}>
                      {t(STATUS_LABEL_KEY[rental.status])}
                    </span>
                    {rental.status === "approved" && (
                      <Link
                        to={`/customer/plots/${rental.plot.id}`}
                        className="text-sm font-medium text-moss hover:underline"
                      >
                        {t("customer:openPlot")}
                      </Link>
                    )}
                  </span>
                }
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
