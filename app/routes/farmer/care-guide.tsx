import { useTranslation } from "react-i18next";
import type { Route } from "./+types/care-guide";
import { CareGuideEditor } from "~/components/care-guide-editor";
import { requireRole } from "~/lib/guards";
import { listCrops } from "~/lib/fields";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:careGuideMetaTitle") }];
}

export async function clientLoader() {
  await requireRole("farmer");
  const crops = await listCrops();
  return { crops };
}

/**
 * The farmer's side of the weekly care guide (issue #65, backend #68): every
 * crop starts from the platform's default guide, and a farmer can make it
 * their farm's own — for their tenants only — or reset it to the default.
 */
export default function FarmerCareGuide({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation("farmer");

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold text-forest">{t("careGuideTitle")}</h1>
      <p className="mt-1 text-sm text-warm-olive">{t("careGuideIntro")}</p>
      <CareGuideEditor crops={loaderData.crops} role="farmer" />
    </main>
  );
}
