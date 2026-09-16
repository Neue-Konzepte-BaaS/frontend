import { Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/layout";
import { requireRole } from "~/lib/guards";
import { LogoutButton } from "~/components/logout-button";
import { LanguageSwitcher } from "~/components/language-switcher";
import { AppShell } from "~/components/nav/app-shell";
import { useFarmerNavItems, useFarmerMobileNavItems, useFarmerSettingsItem } from "~/lib/nav-items";

/**
 * Shared chrome + auth guard for every /farmer/* route. Runs requireRole once
 * per navigation here rather than in each child, so children can read the
 * account via useRouteLoaderData("farmer-layout") instead of each calling
 * me() again.
 */
export async function clientLoader() {
  const account = await requireRole("farmer");
  return { account };
}

export default function FarmerLayout({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  const { t } = useTranslation("common");
  const items = useFarmerNavItems();
  const mobileItems = useFarmerMobileNavItems();
  const settingsItem = useFarmerSettingsItem();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("brand")}</p>
            <p className="font-mono text-xs text-gray-400 dark:text-gray-500">{account.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <LogoutButton />
          </div>
        </div>
      </header>
      <AppShell items={items} mobileItems={mobileItems} pinned={settingsItem}>
        <Outlet />
      </AppShell>
    </div>
  );
}
