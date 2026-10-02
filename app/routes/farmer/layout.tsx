import { Link, Outlet } from "react-router";
import type { Route } from "./+types/layout";
import { requireRole, requireActiveSubscription, requireFarmCropRatesSet } from "~/lib/guards";
import { LogoutButton } from "~/components/logout-button";
import { AppShell } from "~/components/nav/app-shell";
import { useFarmerNavItems, useFarmerMobileNavItems, useFarmerSettingsItem, useFarmerSubscriptionItem } from "~/lib/nav-items";
import { LanguageSwitcher } from "~/components/language-switcher";

/**
 * Shared chrome + auth guard for every /farmer/* route, including the
 * subscription picker/checkout/return pages themselves — they're nested
 * here too so a farmer never loses the header/sidebar mid-flow. Runs
 * requireRole once per navigation here rather than in each child, so
 * children can read the account via useRouteLoaderData("farmer-layout")
 * instead of each calling me() again. requireActiveSubscription runs right
 * after: a farmer with no Active/PastDue subscription is redirected to
 * /farmer/subscribe before any other dashboard content renders, mirroring
 * the backend's own RequireActiveSubscription middleware (see
 * ~/lib/guards.ts) — it exempts the subscription flow's own pages from that
 * redirect so visiting them doesn't loop.
 *
 * requireFarmCropRatesSet runs only once a subscription is confirmed active
 * — an unsubscribed farmer is already being bounced to /farmer/subscribe,
 * so there's no point also forcing them through crop pricing first. It
 * redirects to /farmer/settings until the farmer has priced at least one
 * crop farm-wide, closing the gap where a farmer could otherwise list plots
 * and crops that never actually become rentable (see ~/lib/guards.ts).
 */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const account = await requireRole("farmer");
  const pathname = new URL(request.url).pathname;
  const hasActiveSubscription = await requireActiveSubscription(pathname);
  const hasFarmCropRatesSet = hasActiveSubscription ? await requireFarmCropRatesSet(pathname) : true;
  return { account, hasActiveSubscription, hasFarmCropRatesSet };
}

export default function FarmerLayout({ loaderData }: Route.ComponentProps) {
  const { account, hasActiveSubscription } = loaderData;
  const allItems = useFarmerNavItems();
  const allMobileItems = useFarmerMobileNavItems();
  const settingsItem = useFarmerSettingsItem();
  const subscriptionItem = useFarmerSubscriptionItem();

  // A farmer with no Active/PastDue subscription only reaches this layout via
  // the subscribe-flow paths exempted above — the rest of the dashboard nav
  // points at routes that 402 for them, so show just the subscription item
  // instead of the full item set until they actually have one.
  const items = hasActiveSubscription ? allItems : [];
  const mobileItems = hasActiveSubscription ? allMobileItems : [];
  const pinned = hasActiveSubscription ? [settingsItem, subscriptionItem] : subscriptionItem;

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
      <AppShell items={items} mobileItems={mobileItems} pinned={pinned}>
        <Outlet />
      </AppShell>
    </div>
  );
}
