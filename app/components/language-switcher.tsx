import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
] as const;

/** Small EN/DE toggle. Persists via i18next-browser-languagedetector (localStorage). */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.language.startsWith("de") ? "de" : "en";

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t("common:language")}>
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => i18n.changeLanguage(code)}
          aria-pressed={current === code}
          className={
            "rounded-md px-2 py-1 text-xs font-medium " +
            (current === code
              ? "bg-emerald-600 text-white"
              : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800")
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
