import { useTranslation } from "react-i18next";
import { BroadcastSection } from "~/components/admin/broadcast-section";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("admin:broadcastMetaTitle") }];
}

/** No clientLoader: sending a broadcast needs nothing loaded up front. */
export default function AdminBroadcast() {
  const { t } = useTranslation("admin");

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("notificationsTitle")}</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("notificationsBody")}</p>
      <BroadcastSection />
    </main>
  );
}
