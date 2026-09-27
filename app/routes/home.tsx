import { Link, NavLink, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/home";
import { me, dashboardPath } from "~/lib/auth";
import { LanguageSwitcher } from "~/components/language-switcher";
import i18n from "~/i18n";

export function meta() {
  return [
    { title: i18n.t("home:metaTitle") },
    { name: "description", content: i18n.t("home:metaDescription") },
  ];
}

export async function clientLoader() {
  const account = await me();
  return { account };
}

const FEATURES = [
  {
    key: "PlotPlanner",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    key: "Ripeness",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    key: "Bulletin",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
] as const;

export default function Home({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  const { t } = useTranslation(["home", "common"]);
  const navigate = useNavigate();

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim();
    if (!q) { navigate("/search"); return; }
    const isPostal = /^\d+$/.test(q);
    navigate(`/search?${isPostal ? "postalCode" : "city"}=${encodeURIComponent(q)}`);
  }

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

      {/* ── Hero ── */}
      <section className="relative h-[calc(100vh-80px)] min-h-[600px] overflow-hidden">
        <video autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover">
          <source src="/vecteezy_videofam.mp4" type="video/mp4" />
        </video>

        {/* warm colour tint */}
        <div className="absolute inset-0 bg-olive/20 mix-blend-multiply" />
        {/* left gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-forest/85 via-forest/50 to-transparent" />
        {/* bottom fade into page background */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-paper/60 to-transparent" />

        <div className="relative z-10 flex h-full items-center">
          <div className="mx-auto w-full max-w-7xl px-8">
            <div className="max-w-2xl">
              <h1 className="font-serif text-6xl font-bold leading-[1.05] tracking-tight text-ivory sm:text-7xl">
                {t("home:heroHeadline1")}<br />
                {t("home:heroHeadline2")}<br />
                {t("home:heroHeadline3")}
              </h1>
              <p className="mt-5 text-lg text-cream/90">
                {t("home:heroSubtitle")}
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/search"
                  className="inline-flex items-center gap-2 rounded-full bg-deep-olive px-8 py-3.5 text-base font-semibold text-ivory hover:bg-moss"
                >
                  {t("home:findPlotCta")} →
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-full border border-ivory/40 bg-white/10 px-8 py-3.5 text-base font-semibold text-ivory backdrop-blur-sm hover:bg-white/20"
                >
                  {t("home:runFarmCta")} →
                </Link>
              </div>
            </div>

            <p className="absolute right-10 bottom-12 text-right text-base italic text-ivory/70">
              Real farms.<br />Real people.
            </p>
          </div>
        </div>
      </section>

      {/* ── Built for small farms ── */}
      <section className="bg-paper py-24">
        <div className="mx-auto max-w-7xl px-8">
          <div className="grid gap-16 md:grid-cols-[1fr_1.4fr] md:items-center">
            <div>
              <h2 className="font-serif text-5xl font-bold leading-tight text-forest">
                {t("home:builtTitle1")}<br />
                {t("home:builtTitle2")}
              </h2>
              <p className="body-lg mt-6 max-w-md">
                {t("home:builtBody")}
              </p>
              <div className="mt-8 flex items-center gap-2 text-warm-olive">
                <div className="h-px w-10 bg-warm-olive/50" />
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M12 2C8 6 6 10 8 16 10 12 11 10 12 9 13 10 14 12 16 16 18 10 16 6 12 2Z" />
                </svg>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border-4 border-cream shadow-xl">
              <img
                src="/farmerGirl.jpeg"
                alt="Farmer on the field"
                className="aspect-[3/2] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Everything your farm needs ── */}
      <section className="bg-paper pb-24">
        <div className="mx-auto max-w-7xl px-8">
          <h2 className="font-serif text-4xl font-bold text-center text-forest">{t("home:featuresTitle")}</h2>

          <ul className="mt-12 grid gap-6 sm:grid-cols-3">
            {FEATURES.map(({ key, icon }) => (
              <li
                key={key}
                className="flex flex-col items-center rounded-2xl border border-beige/40 bg-paper px-10 py-12 text-center shadow-sm"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-deep-olive/10 text-deep-olive">
                  {icon}
                </div>
                <h3 className="font-serif text-xl font-semibold text-deep-olive">{t(`home:feature${key}Title`)}</h3>
                <p className="body-sm mt-3">{t(`home:feature${key}Body`)}</p>
                <div className="mt-8 flex h-9 w-9 items-center justify-center rounded-full border border-beige text-warm-olive">
                  →
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── From plot to harvest ── */}
      <section className="overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="relative min-h-[380px] overflow-hidden">
            <img
              src="/vegField.jpg"
              alt="Vegetable field"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-forest/30" />
          </div>

          <div className="flex items-center bg-sage/30 px-14 py-20">
            <div>
              <h2 className="font-serif text-4xl font-bold text-forest">{t("home:harvestTitle")}</h2>
              <p className="body-lg mt-5 max-w-sm">{t("home:harvestBody")}</p>
              <Link
                to="/register"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-deep-olive px-8 py-3.5 text-base font-semibold text-ivory hover:bg-moss"
              >
                {t("home:howItWorks")} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Looking for a plot ── */}
      <section className="bg-forest py-18">
        <div className="mx-auto max-w-7xl px-8 md:flex md:items-center md:justify-between md:gap-12">
          <div className="mb-6 md:mb-0">
            <h2 className="font-serif text-3xl font-bold text-ivory">{t("home:lookingForPlotTitle")}</h2>
            <p className="mt-2 text-base text-cream/70">{t("home:lookingForPlotBody")}</p>
          </div>

          <form onSubmit={handleSearch} className="flex max-w-md flex-1 items-center overflow-hidden rounded-full border border-beige/20 bg-white/10">
            <div className="flex items-center gap-2 px-5 text-cream/60">
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <input
              name="q"
              type="text"
              placeholder={t("home:searchPlaceholder")}
              className="flex-1 bg-transparent py-3 text-sm text-ivory placeholder-cream/50 focus:outline-none"
            />
            <button
              type="submit"
              className="m-1.5 shrink-0 rounded-full bg-olive px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-warm-olive"
            >
              {t("home:searchPlotsCta")} →
            </button>
          </form>
        </div>
        <p className="text-muted mx-auto mt-5 max-w-7xl px-8">{t("home:searchTagline")}</p>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-forest py-8">
        <div className="mx-auto max-w-7xl px-8">
          <p className="text-xs text-beige/40">{t("common:brand")}</p>
        </div>
      </footer>
    </div>
  );
}
