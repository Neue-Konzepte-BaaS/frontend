import { redirect } from "react-router";
import { me, dashboardPath, type Account, type Role } from "~/lib/auth";

/**
 * clientLoader guard for a role-specific page. Resolve the session via the auth
 * cookie and enforce the role:
 *   - not authenticated (401) → /login
 *   - wrong role             → the caller's own dashboard
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
    throw redirect(dashboardPath(account.role));
  }
  return account;
}

/**
 * clientLoader guard for a page that works for BOTH anonymous visitors and
 * one specific role (currently only /customer, for public plot search).
 * Unlike requireRole, a missing session is not an error — it resolves to
 * `null` so the page can render its logged-out mode. A session with the
 * wrong role still redirects to that role's own dashboard, same as
 * requireRole, since e.g. a farmer landing on the customer search page isn't
 * "logged out" from that page's perspective, just in the wrong place.
 */
export async function resolveOptionalRole(role: Role): Promise<Account | null> {
  const account = await me();
  if (!account) return null;
  if (account.role !== role) {
    throw redirect(dashboardPath(account.role));
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
