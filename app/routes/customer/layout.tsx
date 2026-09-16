import { Link, Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/layout";
import { requireRole } from "~/lib/guards";
import { LogoutButton } from "~/components/logout-button";
import { LanguageSwitcher } from "~/components/language-switcher";
import { AppShell } from "~/components/nav/app-shell";
import { useTenantNavItems } from "~/lib/nav-items";

/**
 * Shared chrome + auth guard for every authenticated /customer/* route
 * (Home, Board, Inbox, Me) — mirrors farmer/layout.tsx. /search is
 * deliberately NOT nested here even though it's also a tenant nav
 * destination: it must stay reachable by anonymous visitors, so it stays a
 * standalone route and renders the same AppShell itself, only when a
 * customer is signed in.
 */
export async function clientLoader() {
  const account = await requireRole("customer");
  return { account };
}

export default function CustomerLayout({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  const { t } = useTranslation("common");
  const items = useTenantNavItems();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
            {t("brand")}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <p className="hidden font-mono text-xs text-gray-400 sm:block dark:text-gray-500">{account.id}</p>
            <LogoutButton />
          </div>
        </div>
      </header>
      <AppShell items={items}>
        <Outlet />
      </AppShell>
    </div>
  );
}
