import { Link } from "react-router";
import type { Route } from "./+types/search";
import { me, dashboardPath } from "~/lib/auth";
import { PlotSearch } from "~/components/plot-search";
import { submitClass } from "~/components/form";
import { LogoutButton } from "~/components/logout-button";

export function meta() {
  return [{ title: "Find a plot near you · BaaS" }];
}

/**
 * The public plot search — open to everyone, including anonymous visitors.
 *
 * Deliberately resolves the session with `me()` rather than
 * `resolveOptionalRole("customer")`: that guard redirects a wrong-role visitor
 * to their own dashboard, which is right for /customer but wrong here. A
 * farmer or admin following the landing page's CTA should be able to browse
 * public search without being ejected to their own dashboard. Every role (and
 * nobody at all) renders the same page; only the header and the per-result
 * action differ.
 */
export async function clientLoader() {
  const account = await me();
  return { account };
}

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  // Only a customer can actually rent; anyone else browsing gets the
  // logged-out affordance ("Log in to rent") on each result.
  const customer = account?.role === "customer" ? account : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <Link to="/" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
            Bauer as a Service
          </Link>
          {account ? (
            <div className="flex items-center gap-3">
              <Link
                to={dashboardPath(account.role)}
                className="whitespace-nowrap text-sm font-medium text-gray-700 hover:underline dark:text-gray-200"
              >
                Go to dashboard
              </Link>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login?redirect=/search"
                className="whitespace-nowrap text-sm font-medium text-gray-700 hover:underline dark:text-gray-200"
              >
                Sign in
              </Link>
              <Link to="/register?redirect=/search" className={`${submitClass} inline-block w-auto px-4 py-2 text-sm`}>
                Create account
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Find a plot near you</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Search a German postal code or city to see available self-harvest plots nearby.
        </p>

        <PlotSearch account={customer} loginRedirectTo="/search" />
      </main>
    </div>
  );
}
