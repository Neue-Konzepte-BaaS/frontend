import { useTranslation } from "react-i18next";

/**
 * TEMPORARY — placeholder to verify auth & role routing (Issue #8).
 * Replace with the real dashboard. This banner exists to make sure no one
 * mistakes these dummy screens for finished product work.
 */
export function TemporaryBanner() {
  const { t } = useTranslation("admin");

  return (
    <div
      role="note"
      className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <strong>{t("temporaryScreenLead")}</strong> {t("temporaryScreenBody")}
    </div>
  );
}
