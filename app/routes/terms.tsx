import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "~/components/language-switcher";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("legal:termsMetaTitle") }];
}

/**
 * Public AGB page — reachable by anyone, logged in or not (mirrors
 * home.tsx/register.tsx's public header), since it's linked from the rental
 * request form's acceptance checkbox before a customer ever signs in to pay.
 */
export default function Terms() {
  const { t } = useTranslation(["legal", "common"]);

  const sections = [1, 2, 3, 4, 5, 6, 7] as const;

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-cream">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-3">
            <img src="/farmlandlogo.png" alt="Farmland" className="h-10 w-10 rounded-full" />
            <span className="-translate-y-1 text-2xl font-bold text-forest" style={{ fontFamily: "'Playfair Display', serif" }}>Farmland</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-serif text-3xl font-bold text-forest">{t("legal:termsTitle")}</h1>
        <p className="mt-4 text-wood">{t("legal:termsIntro")}</p>

        <div className="mt-6 rounded-lg border border-moss/40 bg-moss/10 p-4">
          <h2 className="text-base font-semibold text-forest">{t("legal:termsDisclaimerHeading")}</h2>
          <p className="mt-2 text-sm text-wood">{t("legal:termsDisclaimerBody")}</p>
        </div>

        <div className="mt-8 space-y-6">
          {sections.map((n) => (
            <div key={n}>
              <h2 className="text-lg font-semibold text-forest">{t(`legal:termsSection${n}Heading`)}</h2>
              <p className="mt-1 text-wood">{t(`legal:termsSection${n}Body`)}</p>
            </div>
          ))}
        </div>

        <Link to="/" className="mt-10 inline-block text-sm font-medium text-moss hover:underline">
          {t("legal:termsBackToHome")}
        </Link>
      </main>
    </div>
  );
}
