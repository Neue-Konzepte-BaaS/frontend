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
