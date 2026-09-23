import { Link } from "react-router";
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
      {/* Broadcast is the one admin destination left out of the five-slot
          mobile bottom bar, so no tab is marked active while you're here —
          this link is the way back. Hidden where the sidebar does that job. */}
      <Link to="/admin" className="text-sm text-warm-olive hover:underline md:hidden">
        ← {t("overviewTitle")}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-forest md:mt-0">{t("notificationsTitle")}</h1>
      <p className="mt-1 text-sm text-warm-olive">{t("notificationsBody")}</p>
      <BroadcastSection />
    </main>
  );
}
