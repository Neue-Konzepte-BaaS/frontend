// TEMPORARY dummy dashboard (Issue #8) — verifies admin auth + role routing.
// Replace with the real admin dashboard. See components/temporary-banner.tsx.
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/admin";
import { requireRole } from "~/lib/guards";
import { TemporaryBanner } from "~/components/temporary-banner";
import { AccountTypeNotice } from "~/components/account-type-notice";
import { LogoutButton } from "~/components/logout-button";

export async function clientLoader() {
  const account = await requireRole("admin");
  return { account };
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  const { t } = useTranslation("admin");

  return (
    <main className="mx-auto max-w-3xl p-8">
      <TemporaryBanner />
      <AccountTypeNotice />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {t("dashboardTitle")}
      </h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">
        {t("signedInAs", { id: account.id })}
      </p>

      <section className="mt-6 rounded-lg border border-gray-200 p-6 dark:border-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-white">{t("statisticsTitle")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("statisticsBody")}</p>
      </section>

      <div className="mt-8">
        <LogoutButton />
      </div>
    </main>
  );
}
