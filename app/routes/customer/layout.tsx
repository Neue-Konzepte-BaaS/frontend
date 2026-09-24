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
            <span className="hidden text-sm font-medium text-wood sm:block">
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
