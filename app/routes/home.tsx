import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/home";
import { me, dashboardPath } from "~/lib/auth";
import { submitClass, secondaryButtonClass } from "~/components/form";
import { LanguageSwitcher } from "~/components/language-switcher";
import i18n from "~/i18n";

export function meta() {
  return [
    { title: i18n.t("home:metaTitle") },
    {
      name: "description",
      content: i18n.t("home:metaDescription"),
    },
  ];
}

/**
 * The public landing page. Unlike every other entry point, this one never
 * redirects: a logged-in visitor sees the same pitch with a "Go to dashboard"
 * button instead of the sign-in pair. (It used to redirect everyone — to their
 * dashboard, or to /login — which meant a first-time visitor met a login form
 * with no idea what BaaS was.)
 */
export async function clientLoader() {
  const account = await me();
  return { account };
}

/** MVP features worth naming up front — see context.md's must-have list. */
const FEATURE_KEYS = ["PlotPlanner", "Ripeness", "Bulletin"] as const;

export default function Home({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  const { t } = useTranslation(["home", "common"]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <p className="whitespace-nowrap font-semibold text-gray-900 dark:text-white">{t("common:brand")}</p>
          {account ? (
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link
                to={dashboardPath(account.role)}
                className={`${submitClass} inline-block w-auto whitespace-nowrap px-4 py-2 text-sm`}
              >
                {t("common:goToDashboard")}
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link
                to="/login"
                className="whitespace-nowrap text-sm font-medium text-gray-700 hover:underline dark:text-gray-200"
              >
                {t("common:signIn")}
              </Link>
              <Link to="/register" className={`${submitClass} inline-block w-auto px-4 py-2 text-sm`}>
                {t("common:createAccount")}
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4">
        <section className="py-12 sm:py-20">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
            {t("home:heroTitle")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300">{t("home:heroBody1")}</p>
          <p className="mt-3 max-w-2xl text-lg text-gray-600 dark:text-gray-300">{t("home:heroBody2")}</p>

          {/* items-start keeps the buttons at their content width once the
              row direction kicks in — submitClass carries w-full for forms. */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start">
            <Link to="/search" className={`${submitClass} inline-block px-6 text-center sm:w-auto`}>
              {t("home:findPlotCta")}
            </Link>
            <Link to="/register" className={`${secondaryButtonClass} inline-block px-6 text-center sm:w-auto`}>
              {t("home:runFarmCta")}
            </Link>
          </div>
        </section>

        <section className="border-t border-gray-200 py-12 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("home:featuresTitle")}</h2>
          <ul className="mt-8 grid gap-8 sm:grid-cols-3">
            {FEATURE_KEYS.map((key) => (
              <li key={key}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t(`home:feature${key}Title`)}
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-300">{t(`home:feature${key}Body`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-gray-200 py-12 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("home:lookingForPlotTitle")}</h2>
          <p className="mt-2 max-w-2xl text-lg text-gray-600 dark:text-gray-300">{t("home:lookingForPlotBody")}</p>
          <Link to="/search" className={`${submitClass} mt-6 inline-block px-6 text-center sm:w-auto`}>
            {t("home:searchPlotsCta")}
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-5xl p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("common:brand")}</p>
        </div>
      </footer>
    </div>
  );
}
