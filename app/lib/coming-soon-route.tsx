import { useTranslation } from "react-i18next";
import { ComingSoon } from "~/components/coming-soon";
import i18n from "~/i18n";

type Namespace = "farmer" | "search";

/**
 * Builds the `meta()` export for a route that's just a ComingSoon
 * placeholder — see issue #27's stub nav destinations (Tenants, Requests,
 * Care guide, Farm settings, Inbox, Me — everywhere the nav exists but the
 * feature behind it doesn't yet; Board was one of these until issue #39).
 * Keeps each of those remaining route files down to the one line that
 * actually differs between them: which translation keys to read.
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
