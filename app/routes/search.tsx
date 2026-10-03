import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/search";
import { me, dashboardPath } from "~/lib/auth";
import { PlotSearch } from "~/components/plot-search";
import { AppShell } from "~/components/nav/app-shell";
import { LanguageSwitcher } from "~/components/language-switcher";
import { LogoutButton } from "~/components/logout-button";
import { useTenantNavItems } from "~/lib/nav-items";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("search:searchMetaTitle") }];
}

export async function clientLoader() {
  const account = await me();
  return { account };
}

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  const customer = account?.role === "customer" ? account : null;
  const { t } = useTranslation(["search", "common", "home"]);
  const tenantNavItems = useTenantNavItems();
  // 0 means "unknown" (see Account.postalCode) — only a real postal code is
  // worth auto-centering/auto-searching the map on.
  const homePostalCode = customer && customer.postalCode > 0 ? customer.postalCode : undefined;

  const content = (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-forest">{t("search:searchTitle")}</h1>
      <p className="mt-2 text-wood">{t("search:searchSubtitle")}</p>
      <PlotSearch homePostalCode={homePostalCode} />
    </main>
  );

  if (customer) {
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
                {customer.firstName} {customer.lastName}
              </span>
              <LogoutButton />
            </div>
          </div>
        </header>
        <AppShell items={tenantNavItems}>{content}</AppShell>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="bg-cream">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-3">
            <img src="/farmlandlogo.png" alt="Farmland" className="h-10 w-10 rounded-full" />
            <span className="-translate-y-1 text-2xl font-bold text-forest" style={{fontFamily: "'Playfair Display', serif"}}>Farmland</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {account ? (
              <Link to={dashboardPath(account.role)} className="rounded-full bg-deep-olive px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-moss">
                {t("common:goToDashboard")}
              </Link>
            ) : (
              <>
                <Link to="/login" className="min-w-[80px] text-center text-base font-semibold text-forest hover:text-moss">{t("common:signIn")}</Link>
                <Link to="/register" className="min-w-[130px] rounded-full bg-deep-olive px-6 py-2.5 text-center text-sm font-semibold text-ivory hover:bg-moss">{t("home:getStarted")}</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="flex flex-1 items-start justify-center pt-16">
        {content}
      </div>
    </div>
  );
}
