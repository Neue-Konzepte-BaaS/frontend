import { Link, Outlet } from "react-router";
import type { Route } from "./+types/layout";
import { requireRole } from "~/lib/guards";
import { LogoutButton } from "~/components/logout-button";
import { AppShell } from "~/components/nav/app-shell";
import { useFarmerNavItems, useFarmerMobileNavItems, useFarmerSettingsItem } from "~/lib/nav-items";
import { LanguageSwitcher } from "~/components/language-switcher";

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
  const items = useFarmerNavItems();
  const mobileItems = useFarmerMobileNavItems();
  const settingsItem = useFarmerSettingsItem();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-beige bg-cream">
        <div className="flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/farmlandlogo.png" alt="Farmland" className="h-10 w-10 rounded-full" />
              <span className="-translate-y-1 text-2xl font-bold text-forest" style={{fontFamily: "'Playfair Display', serif"}}>Farmland</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              to="/farmer/settings"
              className="hidden text-base font-semibold text-forest hover:underline sm:block"
            >
              {account.firstName} {account.lastName}
            </Link>
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
