import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Check, Loader2 } from "lucide-react";
import { getSubscriptionPlans, getSubscriptionStatusOrNull, hasActiveSubscription, type SubscriptionPlan } from "~/lib/subscriptions";
import { formatPriceCents } from "~/components/plot-card";
import { FormError, primaryButtonClass } from "~/components/form";
import type { Route } from "./+types/subscribe";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("subscription:pickerMetaTitle") }];
}

/**
 * Plan picker for a farmer with no Active/PastDue subscription — the
 * destination farmer/layout.tsx's clientLoader redirects to (see
 * requireActiveSubscription in ~/lib/guards.ts). Nested inside farmer-layout
 * like every other farmer page (that guard specifically exempts this path
 * from its own redirect, so visiting it doesn't loop) — role/auth are
 * already handled by the layout's clientLoader, so this one only loads what
 * the page itself needs.
 *
 * A farmer who already has a subscription reaches this page too — via the
 * pinned "Subscription" nav item once inside the dashboard — so it also
 * doubles as a lightweight status view for that case, rather than only
 * being reachable during onboarding.
 */
export async function clientLoader() {
  const [plans, subscription] = await Promise.all([getSubscriptionPlans(), getSubscriptionStatusOrNull()]);
  return { plans, subscription };
}

export default function FarmerSubscribe({ loaderData }: Route.ComponentProps) {
  const { plans, subscription } = loaderData;
  const { t, i18n: i18nInstance } = useTranslation(["subscription", "common"]);
  const priceLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (subscription && hasActiveSubscription(subscription)) {
    return (
      <main className="mx-auto max-w-lg p-4">
        <h1 className="text-2xl font-bold text-forest">{t("subscription:currentPlanTitle")}</h1>
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-moss/40 bg-moss/10 p-4">
          <Check className="h-6 w-6 shrink-0 text-moss" strokeWidth={2.5} />
          <div>
            <p className="font-semibold text-forest">
              {subscription.status === "past_due" ? t("subscription:statusPastDue") : t("subscription:statusActive")}
            </p>
            {subscription.currentPeriodEnd && (
              <p className="text-sm text-wood">
                {t("subscription:renewsOn", { date: new Date(subscription.currentPeriodEnd).toLocaleDateString(priceLocale) })}
              </p>
            )}
          </div>
        </div>
        <Link to="/farmer" className="mt-6 inline-block text-sm font-medium text-moss hover:underline">
          {t("subscription:goToDashboard")}
        </Link>
      </main>
    );
  }

  function choosePlan(plan: SubscriptionPlan) {
    setError(null);
    navigate("/farmer/subscribe/checkout", { state: { planId: plan.id } });
  }

  // The middle of exactly three tiers is the one worth nudging farmers
  // toward — cheapest-first ordering (see getSubscriptionPlans) makes that
  // reliably index 1. Doesn't try to highlight anything for a different
  // plan count (e.g. if a tier is temporarily retired): there is no
  // "middle" of two, and guessing one for four-plus would misrepresent
  // which tier the backend/admin actually intends as the recommended one.
  const highlightedIndex = plans.length === 3 ? 1 : -1;

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-3xl font-bold text-forest">{t("subscription:pickerTitle")}</h1>
      <p className="mt-2 text-base text-wood">{t("subscription:pickerBody")}</p>

      {error && <div className="mt-4"><FormError message={error} /></div>}

      {plans.length === 0 ? (
        <p className="mt-6 flex items-center gap-2 text-wood">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("subscription:loadingPlans")}
        </p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {plans.map((plan, i) => {
            const highlighted = i === highlightedIndex;
            return (
              <div
                key={plan.id}
                className={
                  highlighted
                    ? "relative flex flex-col rounded-2xl border-2 border-moss bg-cream p-8 shadow-lg sm:-my-4 sm:scale-105"
                    : "relative flex flex-col rounded-2xl border border-beige bg-cream p-8"
                }
              >
                {highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-moss px-4 py-1 text-xs font-semibold uppercase tracking-wide text-ivory">
                    {t("subscription:mostPopular")}
                  </span>
                )}

                <p className="text-xl font-semibold text-forest">{t(`subscription:planName_${plan.code}`, { defaultValue: plan.displayName })}</p>

                <p className="mt-4 text-4xl font-bold text-forest">
                  {formatPriceCents(plan.priceCents, priceLocale)}
                  <span className="text-base font-normal text-wood"> {t("subscription:perMonth")}</span>
                </p>

                <p className="mt-3 text-base text-wood">
                  {plan.maxPlots === null ? t("subscription:unlimitedPlots") : t("subscription:maxPlots", { count: plan.maxPlots })}
                </p>

                <button
                  type="button"
                  onClick={() => choosePlan(plan)}
                  className={
                    highlighted
                      ? `${primaryButtonClass} mt-8 w-full py-3.5 text-base`
                      : `${primaryButtonClass} mt-8 w-full bg-transparent text-moss ring-1 ring-inset ring-moss hover:bg-moss/10 hover:text-moss`
                  }
                >
                  {t("subscription:choosePlan")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
