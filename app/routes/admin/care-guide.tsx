import { useTranslation } from "react-i18next";
import type { Route } from "./+types/care-guide";
import { CareGuideEditor } from "~/components/care-guide-editor";
import { listCrops } from "~/lib/admin";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("admin:careGuidePageMetaTitle") }];
}

/** Loads only the catalog — same as admin/crops.tsx's own loader. */
export async function clientLoader() {
  const crops = await listCrops();
  return { crops };
}

export default function AdminCareGuide({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation("admin");

  return (
    <main className="mx-auto max-w-6xl p-4">
      <h1 className="text-2xl font-bold text-forest">{t("careGuidePageTitle")}</h1>
      <p className="mt-1 text-sm text-warm-olive">{t("careGuidePageIntro")}</p>
      <CareGuideEditor crops={loaderData.crops} role="admin" />
    </main>
  );
}
