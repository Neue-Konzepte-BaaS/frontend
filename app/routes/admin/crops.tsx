import { useTranslation } from "react-i18next";
import type { Route } from "./+types/crops";
import { listCrops } from "~/lib/admin";
import { CropSection } from "~/components/admin/crop-section";
import { CareGuideSection } from "~/components/admin/care-guide-section";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("admin:cropsMetaTitle") }];
}

/** Loads only the catalog — the crop page has no use for platform statistics. */
export async function clientLoader() {
  const crops = await listCrops();
  return { crops };
}

export default function AdminCrops({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation("admin");

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("cropsTitle")}</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("cropsBody")}</p>
      <CropSection initialCrops={loaderData.crops} />
      {/* The weekly care guide hangs off a crop, so it is authored here rather
          than under its own nav entry — see backend#44 and the section's own
          comment. It reads the catalog as loaded; a crop added above appears
          in the picker after the next visit. */}
      <CareGuideSection crops={loaderData.crops} />
    </main>
  );
}
