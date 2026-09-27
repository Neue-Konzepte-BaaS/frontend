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
            <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none">
              <circle cx="16" cy="16" r="16" className="fill-deep-olive" />
              <path d="M16 6 C10 10 8 16 10 22 C12 18 14 16 16 15 C18 16 20 18 22 22 C24 16 22 10 16 6Z" className="fill-beige" />
            </svg>
            <div className="leading-tight">
              <span className="block text-sm font-bold uppercase tracking-widest text-forest">BAUER</span>
              <span className="block text-[10px] text-forest/60">as a service</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {/* The name opens "My farm" (issue #68), the farmer's Me page. */}
            <Link
              to="/farmer/settings"
              className="hidden text-sm font-medium text-wood hover:text-forest hover:underline sm:block"
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
