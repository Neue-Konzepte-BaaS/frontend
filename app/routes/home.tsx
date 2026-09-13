import { redirect } from "react-router";
import { me, dashboardPath } from "~/lib/auth";

/**
 * The index route has no UI of its own: it sends the visitor to the right place
 * based on auth state. Authenticated → their role dashboard; otherwise → /login.
 */
export async function clientLoader() {
  const account = await me();
  if (account) {
    throw redirect(dashboardPath(account.role));
  }
  throw redirect("/login");
}

export default function Home() {
  // Never rendered — clientLoader always redirects.
  return null;
}
