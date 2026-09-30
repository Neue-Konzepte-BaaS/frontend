import { useState } from "react";
import { useTranslation } from "react-i18next";
import { updateSubscriptionPlanPrice, setSubscriptionPlanActive } from "~/lib/admin";
import type { SubscriptionPlan } from "~/lib/subscriptions";
import { ApiError } from "~/lib/api-client";
import { formatPriceCents } from "~/components/plot-card";
import { Field as FormField, FormError, FormSuccess, inputClass, primaryButtonClass, secondaryButtonClass } from "~/components/form";

/**
 * Admin view of every subscription plan, active or retired (issue #73). No
 * "create new plan" here — the backend seeds a fixed set of three tiers at
 * boot (see backend's seedSubscriptionPlans in cmd/api/main.go) and has no
 * endpoint to create an arbitrary new one; this only edits price and active
 * state, mirroring CropSection's create/delete shape for everything else.
 */
export function SubscriptionPlanSection({ initialPlans }: { initialPlans: SubscriptionPlan[] }) {
  const { t } = useTranslation("admin");
  const [plans, setPlans] = useState<SubscriptionPlan[]>(initialPlans);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function startEdit(plan: SubscriptionPlan) {
    setError(null);
    setSuccess(null);
    setEditingId(plan.id);
    setPriceInput((plan.priceCents / 100).toFixed(2));
  }

  async function savePrice(plan: SubscriptionPlan) {
    setError(null);
    setSuccess(null);

    const euros = Number(priceInput);
    if (!Number.isFinite(euros) || euros <= 0) {
      setError(t("subscriptionPlanPriceInvalid"));
      return;
    }

    setSavingId(plan.id);
    try {
      const updated = await updateSubscriptionPlanPrice(plan.id, Math.round(euros * 100));
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSuccess(t("subscriptionPlanPriceSaved", { name: plan.displayName }));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSavingId(null);
    }
  }

  async function toggleActive(plan: SubscriptionPlan) {
    setError(null);
    setSuccess(null);
    setTogglingId(plan.id);
    try {
      await setSubscriptionPlanActive(plan.id, !plan.isActive);
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, isActive: !p.isActive } : p)));
      setSuccess(plan.isActive ? t("subscriptionPlanRetired", { name: plan.displayName }) : t("subscriptionPlanReactivated", { name: plan.displayName }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <section className="mt-4 space-y-4">
      {error && <FormError message={error} />}
      {success && <FormSuccess message={success} />}

      <ul className="divide-y divide-beige rounded-lg border border-beige">
        {plans.map((plan) => (
          <li key={plan.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-forest">
                {plan.displayName}
                {!plan.isActive && <span className="ml-2 text-xs font-normal text-error">{t("subscriptionPlanRetiredBadge")}</span>}
              </p>
              <p className="text-sm text-wood">
                {formatPriceCents(plan.priceCents)} {t("subscriptionPlanPerMonth")} ·{" "}
                {plan.maxPlots === null ? t("subscriptionPlanUnlimitedPlots") : t("subscriptionPlanMaxPlots", { count: plan.maxPlots })}
              </p>
            </div>

            {editingId === plan.id ? (
              <div className="flex shrink-0 items-center gap-2">
                <FormField label={t("subscriptionPlanPriceLabel")} htmlFor={`price-${plan.id}`}>
                  <input
                    id={`price-${plan.id}`}
                    type="number"
                    min={0.01}
                    step={0.01}
                    inputMode="decimal"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    className={`${inputClass} w-28 py-2`}
                  />
                </FormField>
                <button
                  type="button"
                  disabled={savingId === plan.id}
                  onClick={() => savePrice(plan)}
                  className={`${primaryButtonClass} w-auto px-3 py-2 text-sm`}
                >
                  {savingId === plan.id ? t("subscriptionPlanSaving") : t("subscriptionPlanSave")}
                </button>
                <button type="button" onClick={() => setEditingId(null)} className={`${secondaryButtonClass} w-auto px-3 py-2 text-sm`}>
                  {t("subscriptionPlanCancelEdit")}
                </button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => startEdit(plan)} className={`${secondaryButtonClass} w-auto px-3 py-2 text-sm`}>
                  {t("subscriptionPlanChangePrice")}
                </button>
                <button
                  type="button"
                  disabled={togglingId === plan.id}
                  onClick={() => toggleActive(plan)}
                  className={`${secondaryButtonClass} w-auto px-3 py-2 text-sm`}
                >
                  {togglingId === plan.id
                    ? t("subscriptionPlanSaving")
                    : plan.isActive
                      ? t("subscriptionPlanRetire")
                      : t("subscriptionPlanReactivate")}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
