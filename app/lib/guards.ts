import { redirect } from "react-router";
import { me, dashboardPath, type Account, type Role } from "~/lib/auth";
import { getSubscriptionStatusOrNull, hasActiveSubscription } from "~/lib/subscriptions";
import { getFarmCropRates } from "~/lib/fields";

/**
 * dashboardPath(...) plus the query param AccountTypeNotice reads to explain
 * *why* the viewer landed on their own dashboard instead of wherever they
 * were headed — shared by every guard/redirect below that bounces someone
 * off a page meant for a different role.
 */
function dashboardPathWithNotice(account: Account, expectedRole: Role): string {
  return `${dashboardPath(account.role)}?wrongAccountType=${expectedRole}`;
}

/**
 * clientLoader guard for a role-specific page. Resolve the session via the auth
 * cookie and enforce the role:
 *   - not authenticated (401) → /login
 *   - wrong role             → the caller's own dashboard, with a notice
 *   - right role             → return the account for the page to use
 *
 * SPA mode has no server loader, so guards run in `clientLoader` (never `loader`).
 */
export async function requireRole(required: Role): Promise<Account> {
  const account = await me();
  if (!account) {
    throw redirect("/login");
  }
  if (account.role !== required) {
    throw redirect(dashboardPathWithNotice(account, required));
  }
  return account;
}

/**
 * Paths under farmer-layout that must render even for a farmer with no
 * Active/PastDue subscription — the plan picker itself and its Stripe
 * checkout/return pages. requireActiveSubscription below never redirects
 * away from one of these, since redirecting /farmer/subscribe to
 * /farmer/subscribe would loop forever.
 */
const SUBSCRIPTION_FLOW_PATHS = ["/farmer/subscribe", "/farmer/subscribe/checkout", "/farmer/subscribe/return"];

/**
 * clientLoader guard for farmer/layout.tsx, run right after requireRole
 * ("farmer"): redirects to the plan picker unless the caller holds an
 * Active or PastDue subscription — mirrors the backend's own
 * RequireActiveSubscription middleware, which otherwise 402s every one of
 * these routes anyway. Returns whether the subscription is active so the
 * layout can also use it to decide which nav items are safe to show — the
 * full dashboard nav 402s for an unsubscribed farmer, which is exactly the
 * case that lands them on the exempted subscribe-flow paths below.
 *
 * Takes the current pathname rather than assuming it can redirect
 * unconditionally: the picker/checkout/return pages are nested inside
 * farmer-layout too (so they get the same header/sidebar as every other
 * farmer page), and this guard runs on every one of its children — without
 * the exemption below, visiting /farmer/subscribe while unsubscribed would
 * redirect to /farmer/subscribe, which re-runs this same guard, forever.
 */
export async function requireActiveSubscription(pathname: string): Promise<boolean> {
  const sub = await getSubscriptionStatusOrNull();
  const active = hasActiveSubscription(sub);

  if (!active && !SUBSCRIPTION_FLOW_PATHS.includes(pathname)) {
    throw redirect("/farmer/subscribe");
  }
  return active;
}

/**
 * Paths under farmer-layout that must render even for a farmer with no farm
 * crop rates set yet — the farm settings page itself, where those rates are
 * set. requireFarmCropRatesSet below never redirects away from this path,
 * since redirecting /farmer/settings to /farmer/settings would loop forever.
 */
const CROP_RATES_FLOW_PATHS = ["/farmer/settings"];

/**
 * clientLoader guard for farmer/layout.tsx, run right after
 * requireActiveSubscription: redirects to the farm settings page unless the
 * farmer has set at least one farm-wide crop rate. A crop with no rate there
 * never appears as rentable on any plot (see FarmCropRate in ~/lib/fields),
 * so a farmer who skips this would otherwise list plots and crops that
 * silently never show up for customers. Returns whether at least one rate is
 * set, mirroring requireActiveSubscription's return shape.
 */
export async function requireFarmCropRatesSet(pathname: string): Promise<boolean> {
  const rates = await getFarmCropRates();
  const hasRates = rates.length > 0;

  if (!hasRates && !CROP_RATES_FLOW_PATHS.includes(pathname)) {
    throw redirect("/farmer/settings#crop-rates");
  }
  return hasRates;
}

/**
 * Validates a `?redirect=` query param for post-login navigation (e.g. the
 * "Log in to rent" link on /customer sends visitors to
 * `/login?redirect=/customer`). Only a same-origin relative path is honored
 * — anything else (an absolute URL, or `//host` which browsers treat as
 * protocol-relative) is rejected, so a crafted link can't use this app as an
 * open redirect. Returns null if the value isn't safe to use.
 */
export function safeRedirectTarget(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

/**
 * Redirect targets that only make sense for one specific role — content that
 * itself requires the role, unlike /search (open to everyone browsing).
 */
const ROLE_ONLY_REDIRECTS: Partial<Record<string, Role>> = {
  "/customer": "customer",
};

/**
 * `?intent=` values that only make sense for one specific role — the *action*
 * requires the role, regardless of which page the visitor clicked through
 * from. Currently only "rent" (set by the "Log in to rent" link in
 * plot-search.tsx, used on both /search and /customer): renting is a
 * customer-only action even when clicked from /search, which itself has no
 * role restriction. A `redirectTo`-only check would miss this — /search
 * isn't in ROLE_ONLY_REDIRECTS above — since the destination page doesn't
 * require a role even though the button that sent the visitor here does.
 */
const ROLE_FOR_INTENT: Partial<Record<string, Role>> = {
  rent: "customer",
};

/**
 * Resolves where a just-authenticated or just-registered account should
 * land. Honors `redirectTo` unless the destination or the declared intent
 * requires a role the account doesn't have — e.g. a farmer who followed "Log
 * in to rent" (from either /search or /customer) into a fresh login. In that
 * case the account goes to its own dashboard instead, carrying a
 * `wrongAccountType` query param so that dashboard can explain why it didn't
 * end up where it clicked — see components/account-type-notice.tsx.
 */
export function postAuthDestination(account: Account, redirectTo: string | null, intent: string | null): string {
  const pathRole = redirectTo ? ROLE_ONLY_REDIRECTS[redirectTo] : undefined;
  const intentRole = intent ? ROLE_FOR_INTENT[intent] : undefined;
  const requiredRole = pathRole ?? intentRole;

  if (requiredRole && requiredRole !== account.role) {
    return dashboardPathWithNotice(account, requiredRole);
  }
  return redirectTo ?? dashboardPath(account.role);
}
