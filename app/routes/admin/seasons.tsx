import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/seasons";
import { listCrops } from "~/lib/admin";
import { listSeasons, listCropSeasons, type Season } from "~/lib/seasons";
import { SeasonSection } from "~/components/season-section";
import { SeasonAssignment } from "~/components/season-assignment";
import { CropSeasonsTable } from "~/components/crop-seasons-table";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("admin:seasonsMetaTitle") }];
}

export async function clientLoader() {
  const [seasons, cropSeasons, crops] = await Promise.all([listSeasons(), listCropSeasons(), listCrops()]);
  return { seasons, cropSeasons, crops };
}

export default function AdminSeasons({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation("admin");
  const [seasons, setSeasons] = useState<Season[]>(loaderData.seasons);

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-3xl font-bold text-forest">{t("seasonsTitle")}</h1>
      <p className="mt-1 text-sm text-warm-olive">{t("seasonsBody")}</p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SeasonSection role="admin" initialSeasons={seasons} onOwnSeasonsChange={setSeasons} />

        <div className="space-y-8">
          <CropSeasonsTable cropSeasons={loaderData.cropSeasons} />
          <SeasonAssignment crops={loaderData.crops} seasons={seasons} />
        </div>
      </div>
    </main>
  );
}
