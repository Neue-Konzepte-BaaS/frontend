import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/settings";
import { requireRole } from "~/lib/guards";
import { listCrops, getFarmCropRates, setFarmCropRates, resolveCropRatesToSave, type Crop } from "~/lib/fields";
import { ApiError } from "~/lib/api-client";
import { Field as FormField, FormError, FormSuccess, inputClass, submitClass } from "~/components/form";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:settingsMetaTitle") }];
}

/**
 * Farm-wide crop pricing (issue #14) — the farmer's first real content on
 * this route; it was a ComingSoon stub until now. One €/m²/week rate per
 * crop, set once regardless of how many plots grow it — combined with each
 * plot's own base rate (set in field-detail.tsx) to compute what a customer
 * actually pays. A crop with no rate here simply won't be rentable on any of
 * this farm's plots, even if a plot lists it as offered.
 */
export async function clientLoader() {
  await requireRole("farmer");
  const [catalog, rates] = await Promise.all([listCrops(), getFarmCropRates()]);
  return { catalog, rates };
}

export default function FarmerSettings({ loaderData }: Route.ComponentProps) {
  const { catalog, rates: existingRates } = loaderData;
  const { t } = useTranslation(["farmer", "common"]);

  // Euros, as typed, keyed by crop id — converted to cents on save. Prefilled
  // from whatever rate already exists for that crop; a crop the farmer has
  // never priced starts blank.
  const [rateInputs, setRateInputs] = useState<Map<string, string>>(() => {
    const initial = new Map<string, string>();
    for (const rate of loaderData.rates) {
      initial.set(rate.cropId, (rate.priceCentsPerSqmPerWeek / 100).toString());
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function setRateInput(cropId: string, value: string) {
    setSuccess(false);
    setRateInputs((prev) => {
      const next = new Map(prev);
      next.set(cropId, value);
      return next;
    });
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    // Full-replace, but a blank input must never delete an already-set
    // rate — see resolveCropRatesToSave's own docs for why.
    const result = resolveCropRatesToSave(catalog, rateInputs, existingRates);
    if (!result.ok) {
      setError(t("farmer:invalidCropRate", { name: result.invalidCrop.name }));
      return;
    }

    setSaving(true);
    try {
      await setFarmCropRates(result.rates);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common:genericError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg p-4">
      <h1 className="text-2xl font-bold text-forest">{t("farmer:settingsTitle")}</h1>
      <p className="mt-1 text-wood">{t("farmer:cropRatesInstructions")}</p>

      {catalog.length === 0 ? (
        <p className="mt-6 text-sm text-wood">{t("farmer:noCropsInCatalog")}</p>
      ) : (
        <form onSubmit={handleSave} className="mt-6 space-y-4">
          {error && <FormError message={error} />}
          {success && <FormSuccess message={t("farmer:cropRatesSaved")} />}

          <ul className="space-y-3">
            {catalog.map((crop: Crop) => (
              <li key={crop.id}>
                <FormField label={t("farmer:cropDuration", { name: crop.name, months: crop.durationMonths })} htmlFor={`rate-${crop.id}`}>
                  <input
                    id={`rate-${crop.id}`}
                    type="number"
                    min={0}
                    step={0.01}
                    inputMode="decimal"
                    placeholder={t("farmer:cropRatePlaceholder")}
                    value={rateInputs.get(crop.id) ?? ""}
                    onChange={(e) => setRateInput(crop.id, e.target.value)}
                    className={inputClass}
                  />
                </FormField>
              </li>
            ))}
          </ul>

          <button type="submit" disabled={saving} className={`${submitClass} w-auto px-4 py-2 text-sm`}>
            {saving ? t("farmer:savingCropRates") : t("farmer:saveCropRates")}
          </button>
        </form>
      )}
    </main>
  );
}
