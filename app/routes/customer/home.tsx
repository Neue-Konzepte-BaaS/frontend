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

// The tenant's own rental status, which is a good/waiting/bad axis — not the
// planner's occupancy legend, where the same lime/rose pair means "someone
// asked for this plot" and "this plot is taken" and is tied to the map's hues
// (see plot-grid.tsx). Reusing that pair here read backwards: a booked plot
// came out rose, an undecided request lime.
//
// Each state gets its own *shape*, not just its own tint: solid for the
// settled one, a soft fill for the one still waiting, an outline for the one
// that came to nothing. The palette's warm tones sit close together — a
// warm-olive fill and an error fill are only 1.1:1 apart as surfaces, so
// "waiting" and "declined" told apart by tint alone would read as the same
// blob. The transparent border on the filled two keeps all three the same
// height.
//
// Contrast on bg-paper, all past AA for small text: ivory on moss 7.2:1,
// wood on warm-olive/25 5.1:1, wood on paper 6.4:1. The badge this replaces
// had declined at 2.3:1.
const STATUS_BADGE_CLASS: Record<RentalStatus, string> = {
  requested: "border border-transparent bg-warm-olive/25 text-wood",
  approved: "border border-transparent bg-moss text-ivory",
  declined: "border border-error/50 text-wood",
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
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[rental.status]}`}>
                    {t(STATUS_LABEL_KEY[rental.status])}
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
