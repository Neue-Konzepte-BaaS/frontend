import { useTranslation } from "react-i18next";
import type { Route } from "./+types/seasons";
import { requireRole } from "~/lib/guards";
import { listCrops } from "~/lib/fields";
import { listSeasons, listCropSeasons } from "~/lib/seasons";
import { SeasonSection } from "~/components/season-section";
import { SeasonAssignment } from "~/components/season-assignment";
import { CropSeasonsTable } from "~/components/crop-seasons-table";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:seasonsMetaTitle") }];
}

export async function clientLoader() {
  await requireRole("farmer");
  const [seasons, cropSeasons, crops] = await Promise.all([listSeasons(), listCropSeasons(), listCrops()]);
  return { seasons, cropSeasons, crops };
}

/**
 * A farmer's seasons (the platform defaults plus their own, one table — see
 * SeasonSection's role-aware delete) and which season each of their crops
 * is currently tied to (CropSeasonsTable), side by side with the form to
 * change that assignment.
 */
export default function FarmerSeasons({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation("farmer");

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-3xl font-bold text-forest">{t("seasonsTitle")}</h1>
      <p className="mt-1 text-sm text-warm-olive">{t("seasonsBody")}</p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SeasonSection role="farmer" initialSeasons={loaderData.seasons} />

        <div className="space-y-8">
          <CropSeasonsTable cropSeasons={loaderData.cropSeasons} />
          <SeasonAssignment crops={loaderData.crops} seasons={loaderData.seasons} />
        </div>
      </div>
    </main>
  );
}
