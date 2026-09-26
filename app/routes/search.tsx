import { Link, NavLink } from "react-router";
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

  const content = (
    <main className="mx-auto w-full max-w-5xl p-6">
      <h1 className="font-serif text-3xl font-bold text-forest">{t("search:searchTitle")}</h1>
      <p className="mt-2 text-wood">{t("search:searchSubtitle")}</p>
      <PlotSearch />
    </main>
  );

  if (customer) {
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
            <svg viewBox="0 0 32 32" className="h-10 w-10" fill="none">
              <circle cx="16" cy="16" r="16" className="fill-deep-olive" />
              <path d="M16 6 C10 10 8 16 10 22 C12 18 14 16 16 15 C18 16 20 18 22 22 C24 16 22 10 16 6Z" className="fill-beige" />
            </svg>
            <div className="leading-tight">
              <span className="block text-base font-bold uppercase tracking-widest text-forest">BAUER</span>
              <span className="block text-xs text-forest/60">as a service</span>
            </div>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <NavLink to="/" end className={({ isActive }) => isActive ? "text-sm font-bold text-forest" : "text-sm text-wood hover:text-forest"}>{t("home:navHome")}</NavLink>
            <NavLink to="/for-farmers" className={({ isActive }) => isActive ? "text-sm font-bold text-forest" : "text-sm text-wood hover:text-forest"}>{t("home:navForFarmers")}</NavLink>
            <NavLink to="/search" className={({ isActive }) => isActive ? "text-sm font-bold text-forest" : "text-sm text-wood hover:text-forest"}>{t("home:navForCustomers")}</NavLink>
          </nav>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {account ? (
              <Link to={dashboardPath(account.role)} className="rounded-full bg-deep-olive px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-moss">
                {t("common:goToDashboard")}
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-wood hover:text-forest">{t("common:signIn")}</Link>
                <Link to="/register" className="rounded-full bg-deep-olive px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-moss">{t("home:getStarted")}</Link>
              </>
            )}
          </div>
        </div>
      </header>
      {content}
    </div>
  );
}
