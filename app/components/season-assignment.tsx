import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getCropName, type Crop } from "~/lib/fields";
import { assignCropSeason, removeCropSeasonRule, type Season } from "~/lib/seasons";
import { ApiError } from "~/lib/api-client";
import { Field as FormField, FormError, FormSuccess, inputClass, primaryButtonClass } from "~/components/form";

const NO_RESTRICTION = "";

/**
 * Ties one crop to a season (or clears the tie): the default rule for an
 * admin, the caller's own farm's rule for a farmer. `crops` picks which crop
 * is being edited; `seasons` are the options for the season picker — an
 * admin's defaults, or a farmer's defaults ∪ own seasons (see SeasonSection).
 *
 * This doesn't preload which season a crop already has — the backend has no
 * "get the current rule for crop X" read endpoint outside of the plot-search
 * response, so this is a write-only picker: choosing "No restriction" and
 * saving always clears any existing rule, and choosing a season always
 * upserts it, matching PUT /api/crops/{cropId}/season's own upsert semantics.
 */
export function SeasonAssignment({ crops, seasons }: { crops: Crop[]; seasons: Season[] }) {
  const { t, i18n } = useTranslation("admin");
  const [cropId, setCropId] = useState(crops[0]?.id ?? "");
  const [seasonId, setSeasonId] = useState<string>(NO_RESTRICTION);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    setSeasonId(NO_RESTRICTION);
    setError(null);
    setSuccess(null);
  }, [cropId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      if (seasonId === NO_RESTRICTION) {
        await removeCropSeasonRule(cropId);
      } else {
        await assignCropSeason(cropId, seasonId);
      }
      setSuccess(t("seasonAssignSuccess"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (crops.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="font-serif text-xl font-semibold text-forest">{t("seasonAssignHeading")}</h2>
      <p className="mt-1 text-sm text-warm-olive">{t("seasonAssignBody")}</p>

      <button
        type="button"
        onClick={() => setFormOpen((open) => !open)}
        aria-expanded={formOpen}
        className="mt-4 flex items-center gap-1 text-sm font-medium text-moss hover:text-olive"
      >
        {formOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {t("seasonAssignToggle")}
      </button>

      {formOpen && (
        <form onSubmit={handleSubmit} className="mt-4 max-w-sm space-y-4">
          {error && <FormError message={error} />}
          {success && <FormSuccess message={success} />}

          <FormField label={t("seasonAssignCropLabel")} htmlFor="season-assign-crop">
            <select id="season-assign-crop" value={cropId} onChange={(e) => setCropId(e.target.value)} className={inputClass}>
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {getCropName(crop, i18n.language)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("seasonAssignSeasonLabel")} htmlFor="season-assign-season">
            <select id="season-assign-season" value={seasonId} onChange={(e) => setSeasonId(e.target.value)} className={inputClass}>
              <option value={NO_RESTRICTION}>{t("seasonAssignNoRestriction")}</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                  {season.farmId === null ? ` (${t("seasonAssignDefaultSuffix")})` : ""}
                </option>
              ))}
            </select>
          </FormField>

          <button type="submit" disabled={saving} className={`${primaryButtonClass} px-6 py-2 text-sm`}>
            {saving ? t("seasonAssignSaving") : t("seasonAssignSave")}
          </button>
        </form>
      )}
    </section>
  );
}
