import { Link, Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/layout";
import { requireRole } from "~/lib/guards";
import { LogoutButton } from "~/components/logout-button";
import { AppShell } from "~/components/nav/app-shell";
import { useAdminNavItems, useAdminMobileNavItems, useAdminSystemItems } from "~/lib/nav-items";
import { LanguageSwitcher } from "~/components/language-switcher";

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
      <header className="border-b border-beige bg-cream">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <img src="/farmlandlogo.png" alt="Farmland" className="h-10 w-10 rounded-full" />
              <span className="-translate-y-1 text-2xl font-bold text-forest" style={{fontFamily: "'Playfair Display', serif"}}>Farmland</span>
            </Link>
            <span className="hidden rounded-full bg-moss/10 px-2.5 py-0.5 text-xs font-medium text-moss sm:inline">
              {t("admin:roleBadge")}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <span className="hidden text-base font-semibold text-forest sm:block">
              {account.firstName} {account.lastName}
            </span>
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
