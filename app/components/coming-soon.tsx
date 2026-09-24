import { useTranslation } from "react-i18next";

/**
 * Placeholder body for a nav destination that exists (routing, chrome, the
 * nav item itself) but has no real feature behind it yet — see issue #27,
 * which is scoped to the navigation shell, not every screen it links to.
 * Swap this out page by page as each feature actually gets built.
 */
export function ComingSoon({ title }: { title: string }) {
  const { t } = useTranslation("common");

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold text-forest">{title}</h1>
      <div
        role="note"
        className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        <strong>{t("comingSoonLead")}</strong> {t("comingSoonBody")}
      </div>
    </main>
  );
}
