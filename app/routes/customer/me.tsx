import { useState } from "react";
import { Link, useRouteLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/me";
import type { clientLoader as customerLayoutLoader } from "./layout";
import { listMyRentals } from "~/lib/rentals";
import { roleLabel } from "~/lib/auth";
import { PlotCard, formatRentalPeriod } from "~/components/plot-card";
import { Switch } from "~/components/switch";
import { LogoutButton } from "~/components/logout-button";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("customer:meMetaTitle") }];
}

/** The tenant's own profile + settings (issue #34). Rented plots reuse the
 * same `listMyRentals()` call as the Home tab (see customer/home.tsx) —
 * name/role/postal code come from the account the layout already resolved
 * (`requireRole("customer")`), read via useRouteLoaderData rather than
 * fetching it again here. */
export async function clientLoader() {
  const rentals = await listMyRentals();
  return { rentals };
}

const LANGUAGES = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
] as const;

const languagePillClass = (active: boolean) =>
  "rounded-full border px-6 py-3 text-center font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-moss " +
  (active
    ? "border-moss bg-moss text-white"
    : "border-beige text-forest hover:bg-cream");

const logoutButtonClass =
  "w-full rounded-lg border border-beige px-4 py-3 text-base font-semibold text-wood " +
  "hover:bg-cream";

export default function CustomerMe({ loaderData }: Route.ComponentProps) {
  const { rentals } = loaderData;
  const account = useRouteLoaderData<typeof customerLayoutLoader>("customer-layout")?.account;
  const { t, i18n: i18nInstance } = useTranslation(["customer", "auth", "common"]);
  const dateLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const currentLanguage = i18nInstance.language.startsWith("de") ? "de" : "en";

  // Simple mode and the notification toggles below are visual-only for now —
  // there is no backend preference storage or push-notification/email-opt-out
  // support yet (see issue #34 summary). They persist nothing and have no
  // effect beyond their own on/off state; wiring them up needs backend work.
  const [simpleMode, setSimpleMode] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(false);

  if (!account) return null;

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold text-forest">
        {account.firstName} {account.lastName}
      </h1>
      <p className="mt-1 text-wood">
        {roleLabel(t, account.role)}
        {account.postalCode > 0 ? ` · ${account.postalCode}` : ""}
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-wide text-warm-olive uppercase">
          {t("customer:myPlotsHeading")}
        </h2>
        {rentals.length === 0 ? (
          <p className="mt-2 text-wood">
            {t("customer:noRentedPlots")}{" "}
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
                action={null}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-warm-olive uppercase">
          {t("common:language")}
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-3" role="group" aria-label={t("common:language")}>
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              aria-pressed={currentLanguage === code}
              onClick={() => i18nInstance.changeLanguage(code)}
              className={languagePillClass(currentLanguage === code)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-beige px-4">
        <Switch
          id="simple-mode"
          checked={simpleMode}
          onChange={setSimpleMode}
          label={t("customer:simpleModeHeading")}
          description={t("customer:simpleModeDescription")}
        />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-wide text-warm-olive uppercase">
          {t("customer:notificationsHeading")}
        </h2>
        <div className="mt-2 divide-y divide-beige rounded-lg border border-beige px-4">
          <Switch
            id="push-notifications"
            checked={pushEnabled}
            onChange={setPushEnabled}
            label={t("customer:pushNotification")}
          />
          <Switch
            id="email-notifications"
            checked={emailEnabled}
            onChange={setEmailEnabled}
            label={t("customer:emailNotification")}
          />
          <Switch
            id="weekly-digest"
            checked={weeklyDigestEnabled}
            onChange={setWeeklyDigestEnabled}
            label={t("customer:weeklyDigest")}
          />
        </div>
      </section>

      <div className="mt-8">
        <LogoutButton className={logoutButtonClass} />
      </div>
    </main>
  );
}
