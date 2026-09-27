import { Link, NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { me, dashboardPath } from "~/lib/auth";
import { LanguageSwitcher } from "~/components/language-switcher";
import type { Route } from "./+types/for-farmers";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("home:metaTitle") }];
}

export async function clientLoader() {
  const account = await me();
  return { account };
}

export default function ForFarmers({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  const { t } = useTranslation(["home", "common"]);

  return (
    <div className="min-h-screen bg-paper">
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

      <main className="mx-auto max-w-7xl px-8 py-24 text-center">
        <h1 className="font-serif text-5xl font-bold text-forest">{t("home:navForFarmers")}</h1>
        <p className="body-lg mt-6 mx-auto max-w-md">{t("home:comingSoon")}</p>
      </main>
    </div>
  );
}
