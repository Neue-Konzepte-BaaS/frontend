import { redirect } from "react-router";
import { me, dashboardPath, type Account, type Role } from "~/lib/auth";

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
