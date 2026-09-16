import { useTranslation } from "react-i18next";
import type { Route } from "./+types/home";
import { listMyRentals } from "~/lib/rentals";
import { PlotCard } from "~/components/plot-card";
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
  const { t, i18n: i18nInstance } = useTranslation(["search", "common"]);
  const dateLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";

  return (
    <main className="mx-auto max-w-5xl p-4">
      <AccountTypeNotice />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("search:customerTitle")}</h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("search:myRentals")}</h2>
        {rentals.length === 0 ? (
          <p className="mt-2 text-gray-600 dark:text-gray-300">{t("search:noRentalsYet")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800">
            {rentals.map((rental) => (
              <PlotCard
                key={rental.id}
                name={rental.plot.name}
                meta={`${rental.crop.name} · ${formatRentalPeriod(rental.startAt, rental.endAt, dateLocale)}`}
                action={<span className="text-sm text-gray-500">{t("search:booked")}</span>}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function formatRentalPeriod(startAt: string, endAt: string, locale: string): string {
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" });
  return `${dateFormatter.format(new Date(startAt))} – ${dateFormatter.format(new Date(endAt))}`;
}
