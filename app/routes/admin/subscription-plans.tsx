import { useTranslation } from "react-i18next";
import type { Route } from "./+types/subscription-plans";
import { listSubscriptionPlansAdmin } from "~/lib/admin";
import { SubscriptionPlanSection } from "~/components/admin/subscription-plan-section";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("admin:subscriptionPlansMetaTitle") }];
}

export async function clientLoader() {
  const plans = await listSubscriptionPlansAdmin();
  return { plans };
}

export default function AdminSubscriptionPlans({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation("admin");

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold text-forest">{t("subscriptionPlansTitle")}</h1>
      <p className="mt-1 text-sm text-warm-olive">{t("subscriptionPlansBody")}</p>
      <SubscriptionPlanSection initialPlans={loaderData.plans} />
    </main>
  );
}
