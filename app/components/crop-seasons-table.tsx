import { useTranslation } from "react-i18next";
import { formatSeasonWindow, type CropSeason } from "~/lib/seasons";
import { getCropName } from "~/lib/fields";

/**
 * Read-only: every crop in the catalog with the season it's effectively
 * checked against for the caller — the default rule for an admin, or their
 * own farm's rule if it has one, the default otherwise, for a farmer.
 * Assigning happens in SeasonAssignment below/beside this; this table is
 * the only place that currently shows what's already assigned, since the
 * backend has no per-crop "current rule" read endpoint outside of it.
 */
export function CropSeasonsTable({ cropSeasons }: { cropSeasons: CropSeason[] }) {
  const { t, i18n } = useTranslation("admin");
  const locale = i18n.language.startsWith("de") ? "de-DE" : "en-GB";

  if (cropSeasons.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="font-serif text-xl font-semibold text-forest">{t("cropSeasonsHeading")}</h2>
      <p className="mt-1 text-sm text-warm-olive">{t("cropSeasonsBody")}</p>

      <table className="mt-4 w-full border-collapse overflow-hidden rounded-lg border border-beige text-sm">
        <thead>
          <tr className="bg-cream text-left text-xs font-semibold tracking-wide text-warm-olive uppercase">
            <th className="px-4 py-2">{t("cropSeasonsTableCrop")}</th>
            <th className="px-4 py-2">{t("cropSeasonsTableSeason")}</th>
            <th className="px-4 py-2">{t("cropSeasonsTableWindow")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-beige">
          {cropSeasons.map((cropSeason) => (
            <tr key={cropSeason.id}>
              <td className="px-4 py-3 text-wood">{getCropName(cropSeason, i18n.language)}</td>
              <td className="px-4 py-3 text-wood">{cropSeason.season ? cropSeason.season.name : t("seasonAssignNoRestriction")}</td>
              <td className="px-4 py-3 text-wood">{cropSeason.season ? formatSeasonWindow(cropSeason.season, locale) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
