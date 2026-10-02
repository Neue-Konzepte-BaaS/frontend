import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/for-farmers";
import { me, dashboardPath } from "~/lib/auth";
import { LanguageSwitcher } from "~/components/language-switcher";
import i18n from "~/i18n";

export function meta() {
  return [
    { title: i18n.t("farmInfo:metaTitle") },
    { name: "description", content: i18n.t("farmInfo:metaDescription") },
  ];
}

export async function clientLoader() {
  const account = await me();
  return { account };
}

export default function ForFarmers({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  const { t } = useTranslation(["farmInfo", "home", "common"]);

  return (
    <div className="min-h-screen bg-paper">

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

      {/* ── Hero ── */}
      <section className="bg-forest py-24">
        <div className="mx-auto max-w-4xl px-8 text-center">
          <h1 className="font-serif text-5xl font-bold leading-[1.1] tracking-tight text-ivory sm:text-6xl">
            {t("farmInfo:heroHeadline1")}{" "}
            {t("farmInfo:heroHeadline2")}{" "}
            {t("farmInfo:heroHeadline3")}
          </h1>
          <p className="mt-5 text-lg text-cream/90">{t("farmInfo:heroSubtitle")}</p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-paper py-24">
        <div className="mx-auto max-w-3xl px-8 text-center">
          <h2 className="font-serif text-4xl font-bold text-forest">{t("farmInfo:introTitle")}</h2>
          <p className="body-lg mt-5">{t("farmInfo:introBody")}</p>
        </div>
      </section>

      {/* ── Pricing model ── */}
      <section className="bg-sage/30 py-24">
        <div className="mx-auto grid max-w-6xl gap-8 px-8 md:grid-cols-2">
          <div className="rounded-2xl border border-beige/40 bg-paper px-8 py-10 shadow-sm">
            <h3 className="font-serif text-2xl font-semibold text-deep-olive">{t("farmInfo:subscriptionTitle")}</h3>
            <p className="body-md mt-4">{t("farmInfo:subscriptionBody")}</p>
            <Link
              to="/farmer/subscribe"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-moss hover:text-olive"
            >
              {t("farmInfo:subscriptionCta")} →
            </Link>
          </div>

          <div className="rounded-2xl border border-beige/40 bg-paper px-8 py-10 shadow-sm">
            <h3 className="font-serif text-2xl font-semibold text-deep-olive">{t("farmInfo:commissionTitle")}</h3>
            <p className="body-md mt-4">{t("farmInfo:commissionBody")}</p>
          </div>
        </div>
      </section>

      {/* ── Keep your brand ── */}
      <section className="bg-paper py-24">
        <div className="mx-auto max-w-3xl px-8 text-center">
          <h2 className="font-serif text-3xl font-bold text-forest">{t("farmInfo:brandTitle")}</h2>
          <p className="body-lg mt-4">{t("farmInfo:brandBody")}</p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-forest py-20">
        <div className="mx-auto max-w-3xl px-8 text-center">
          <h2 className="font-serif text-3xl font-bold text-ivory">{t("farmInfo:ctaTitle")}</h2>
          <p className="mt-3 text-base text-cream/80">{t("farmInfo:ctaBody")}</p>
          <Link
            to="/register?role=farmer"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-deep-olive px-8 py-3.5 text-base font-semibold text-ivory hover:bg-moss"
          >
            {t("farmInfo:signUpCta")} →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-forest py-8">
        <div className="mx-auto max-w-7xl px-8">
          <p className="text-xs text-cream/70">{t("common:brand")}</p>
        </div>
      </footer>
    </div>
  );
}
