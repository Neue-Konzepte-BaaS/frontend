import { Link, Outlet } from "react-router";
import type { Route } from "./+types/layout";
import { requireRole } from "~/lib/guards";
import { LogoutButton } from "~/components/logout-button";
import { AppShell } from "~/components/nav/app-shell";
import { useTenantNavItems } from "~/lib/nav-items";
import { LanguageSwitcher } from "~/components/language-switcher";

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
  const items = useTenantNavItems();

  return (
    <div className="flex h-screen flex-col">
      <header className="shrink-0 border-b border-beige bg-cream">
        <div className="flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/farmlandlogo.png" alt="Farmland" className="h-10 w-10 rounded-full" />
              <span className="-translate-y-1 text-2xl font-bold text-forest" style={{fontFamily: "'Playfair Display', serif"}}>Farmland</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <span className="hidden text-base font-semibold text-forest sm:block">
              {account.firstName} {account.lastName}
            </span>
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
