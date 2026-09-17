import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/search";
import { me, dashboardPath } from "~/lib/auth";
import { PlotSearch } from "~/components/plot-search";
import { submitClass } from "~/components/form";
import { LogoutButton } from "~/components/logout-button";
import { LanguageSwitcher } from "~/components/language-switcher";
import { AppShell } from "~/components/nav/app-shell";
import { useTenantNavItems } from "~/lib/nav-items";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("search:searchMetaTitle") }];
}

/**
 * The public plot search — open to everyone, including anonymous visitors.
 *
 * Deliberately resolves the session with `me()` rather than `requireRole`:
 * a farmer or admin following the landing page's CTA should be able to
 * browse public search without being ejected to their own dashboard. Every
 * role (and nobody at all) renders the same page; only the header, the
 * tenant nav shell, and the per-result action differ.
 */
export async function clientLoader() {
  const account = await me();
  return { account };
}

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  // Only a customer's session gets the tenant nav rail/bar — an anonymous
  // visitor or a farmer/admin browsing public search isn't in the tenant
  // nav's world (no Board/Inbox/Me to show them).
  const customer = account?.role === "customer" ? account : null;
  const { t } = useTranslation(["search", "common"]);
  const tenantNavItems = useTenantNavItems();

  const content = (
    <main className="mx-auto w-full max-w-5xl p-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("search:searchTitle")}</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-300">{t("search:searchSubtitle")}</p>

      <PlotSearch />
    </main>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between p-4">
          <Link to="/" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
            {t("common:brand")}
          </Link>
          {account ? (
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link
                to={dashboardPath(account.role)}
                className="whitespace-nowrap text-sm font-medium text-gray-700 hover:underline dark:text-gray-200"
              >
                {t("common:goToDashboard")}
              </Link>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link
                to="/login?redirect=/search"
                className="whitespace-nowrap text-sm font-medium text-gray-700 hover:underline dark:text-gray-200"
              >
                {t("common:signIn")}
              </Link>
              <Link to="/register?redirect=/search" className={`${submitClass} inline-block w-auto px-4 py-2 text-sm`}>
                {t("common:createAccount")}
              </Link>
            </div>
          )}
        </div>
      </header>

      {customer ? <AppShell items={tenantNavItems}>{content}</AppShell> : content}
    </div>
  );
}
