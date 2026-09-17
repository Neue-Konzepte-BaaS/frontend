import { Link, Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/layout";
import { requireRole } from "~/lib/guards";
import { LogoutButton } from "~/components/logout-button";
import { LanguageSwitcher } from "~/components/language-switcher";
import { AppShell } from "~/components/nav/app-shell";
import { useAdminNavItems, useAdminMobileNavItems, useAdminSystemItems } from "~/lib/nav-items";

/**
 * Shared chrome + auth guard for every /admin/* route — mirrors
 * farmer/layout.tsx. Runs requireRole once per navigation here rather than in
 * each child, so children can read the account via
 * useRouteLoaderData("admin-layout") instead of each calling me() again.
 */
export async function clientLoader() {
  const account = await requireRole("admin");
  return { account };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  const { t } = useTranslation(["common", "admin"]);
  const items = useAdminNavItems();
  const mobileItems = useAdminMobileNavItems();
  const systemItems = useAdminSystemItems();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
              {t("common:brand")}
            </Link>
            {/* Every /admin page acts on the whole platform, not one farm —
                the badge keeps that visible next to the brand. */}
            <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 sm:inline dark:bg-emerald-950 dark:text-emerald-200">
              {t("admin:roleBadge")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <p className="hidden font-mono text-xs text-gray-400 sm:block dark:text-gray-500">{account.id}</p>
            <LogoutButton />
          </div>
        </div>
      </header>
      <AppShell items={items} mobileItems={mobileItems} pinned={systemItems}>
        <Outlet />
      </AppShell>
    </div>
  );
}
