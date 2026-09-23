import { useTranslation } from "react-i18next";
import { ComingSoon } from "~/components/coming-soon";
import i18n from "~/i18n";

type Namespace = "admin" | "farmer" | "search";

/**
 * Builds the `meta()` export for a route that's just a ComingSoon
 * placeholder — see issue #27's stub nav destinations (Board, Care guide,
 * Farm settings, Inbox, Me — Tenants and Requests have since landed, issues
 * #37 and #36) and issue #25's (Farms, Accounts, Rentals, which wait on
 * admin endpoints the backend doesn't have yet) — everywhere the nav exists
 * but the feature behind it doesn't. Keeps each of those remaining nearly
 * identical route files down to the one line that actually differs between
 * them: which translation keys to read.
 */
export function comingSoonMeta(namespace: Namespace, metaTitleKey: string) {
  return () => [{ title: i18n.t(`${namespace}:${metaTitleKey}`) }];
}

/** Default-export component for a ComingSoon stub route — see comingSoonMeta above. */
export function comingSoonPage(namespace: Namespace, titleKey: string) {
  return function ComingSoonPage() {
    const { t } = useTranslation(namespace);
    return <ComingSoon title={t(titleKey)} />;
  };
}
