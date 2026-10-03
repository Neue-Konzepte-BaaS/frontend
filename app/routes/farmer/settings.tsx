import { useEffect, useState } from "react";
import { Link, useLocation, useRouteLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/settings";
import type { clientLoader as farmerLayoutLoader } from "./layout";
import { requireRole } from "~/lib/guards";
import { listCrops, getFarmCropRates, setFarmCropRates, resolveCropRatesToSave, getCropName, type Crop } from "~/lib/fields";
import { ApiError } from "~/lib/api-client";
import { roleLabel } from "~/lib/auth";
import {
  FARM_ADDRESS_MAX,
  FARM_DESCRIPTION_MAX,
  FARM_NAME_MAX,
  getMyFarm,
  toFarmUpdate,
  updateMyFarm,
  type Farm,
} from "~/lib/farms";
import { Field as FormField, FormError, FormSuccess, inputClass, submitClass, primaryButtonClass } from "~/components/form";
import { LogoutButton } from "~/components/logout-button";
import { DeleteAccountSection } from "~/components/delete-account-section";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:settingsMetaTitle") }];
}

const LANGUAGES = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
] as const;

const languagePillClass = (active: boolean) =>
  "rounded-full border px-6 py-3 text-center font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-moss " +
  (active ? "border-moss bg-moss text-white" : "border-beige text-forest hover:bg-cream");

const logoutButtonClass = "w-full rounded-lg border border-beige px-4 py-3 text-base font-semibold text-wood hover:bg-cream";

/** Today as `YYYY-MM-DD` in the viewer's own calendar — what a date input's `max` expects. */
function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * The farmer's "My farm" page (issue #68): their counterpart to the tenant's
 * Me page, reached from the sidebar, the mobile "Me" tab and the name in the
 * header. The account itself comes from the layout's loader; the farm from
 * GET /api/farms/me (backend #71), which resolves it from the caller.
 *
 * Also carries farm-wide crop pricing (issue #14): one €/m²/week rate per
 * crop, set once regardless of how many plots grow it — combined with each
 * plot's own base rate (set in field-detail.tsx) to compute what a customer
 * actually pays. A crop with no rate here simply won't be rentable on any of
 * this farm's plots, even if a plot lists it as offered.
 */
export async function clientLoader() {
  await requireRole("farmer");
  const [farm, catalog, rates] = await Promise.all([getMyFarm(), listCrops(), getFarmCropRates()]);
  return { farm, catalog, rates };
}

export default function FarmerMyFarm({ loaderData }: Route.ComponentProps) {
  const account = useRouteLoaderData<typeof farmerLayoutLoader>("farmer-layout")?.account;
  const { t, i18n: i18nInstance } = useTranslation(["farmer", "auth", "common"]);
  const currentLanguage = i18nInstance.language.startsWith("de") ? "de" : "en";
  const numberLocale = currentLanguage === "de" ? "de-DE" : "en-GB";
  const { hash } = useLocation();

  const { catalog } = loaderData;
  const existingRates = loaderData.rates;

  // A client-side navigation (e.g. the requireFarmCropRatesSet guard's
  // redirect to #crop-rates) doesn't get the browser's own hash-scroll —
  // that only fires on a full page load — so it's done by hand here.
  useEffect(() => {
    if (hash !== "#crop-rates") return;
    document.getElementById("crop-rates")?.scrollIntoView({ behavior: "smooth" });
  }, [hash]);

  const [farm, setFarm] = useState<Farm>(loaderData.farm);
  const [name, setName] = useState(farm.name);
  const [address, setAddress] = useState(farm.address);
  const [description, setDescription] = useState(farm.description);
  const [foundedAt, setFoundedAt] = useState(farm.foundedAt ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const today = localToday();

  // Euros, as typed, keyed by crop id — converted to cents on save. Prefilled
  // from whatever rate already exists for that crop; a crop the farmer has
  // never priced starts blank.
  const [rateInputs, setRateInputs] = useState<Map<string, string>>(() => {
    const initial = new Map<string, string>();
    for (const rate of existingRates) {
      initial.set(rate.cropId, (rate.priceCentsPerSqmPerWeek / 100).toString());
    }
    return initial;
  });
  const [ratesSaving, setRatesSaving] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [ratesSuccess, setRatesSuccess] = useState(false);

  function setRateInput(cropId: string, value: string) {
    setRatesSuccess(false);
    setRateInputs((prev) => {
      const next = new Map(prev);
      next.set(cropId, value);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const result = toFarmUpdate({ name, address, description, foundedAt }, today);
    if ("problem" in result) {
      setError(t(`farmer:farm_${result.problem}`));
      return;
    }

    setSaving(true);
    try {
      const saved = await updateMyFarm(result.update);
      setFarm(saved);
      setName(saved.name);
      setAddress(saved.address);
      setDescription(saved.description);
      setFoundedAt(saved.foundedAt ?? "");
      setSuccess(t("farmer:farmSaved"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRates(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRatesError(null);
    setRatesSuccess(false);

    // Full-replace, but a blank input must never delete an already-set
    // rate — see resolveCropRatesToSave's own docs for why.
    const result = resolveCropRatesToSave(catalog, rateInputs, existingRates);
    if (!result.ok) {
      setRatesError(t("farmer:invalidCropRate", { name: getCropName(result.invalidCrop, i18nInstance.language) }));
      return;
    }

    setRatesSaving(true);
    try {
      await setFarmCropRates(result.rates);
      setRatesSuccess(true);
    } catch (err) {
      setRatesError(err instanceof ApiError ? err.message : t("common:genericError"));
    } finally {
      setRatesSaving(false);
    }
  }

  if (!account) return null;

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-3xl font-bold text-forest">{t("farmer:settingsTitle")}</h1>
      <p className="mt-1 text-wood">
        {account.firstName} {account.lastName} · {roleLabel(t, account.role)}
        {account.postalCode > 0 ? ` · ${account.postalCode}` : ""}
      </p>

      <section className="mt-6 rounded-2xl border border-beige bg-cream px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl font-semibold text-forest">{farm.name}</h2>
          <Link to={`/search/farms/${farm.id}`} className="text-sm font-medium text-moss hover:underline">
            {t("farmer:farmPublicPageLink")}
          </Link>
        </div>
        <p className="mt-1 text-sm text-wood">
          {t("farmer:farmTotalArea", {
            area: farm.totalSquareMeters.toLocaleString(numberLocale, { maximumFractionDigits: 0 }),
          })}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-warm-olive uppercase">{t("farmer:farmDetailsHeading")}</h2>
        <p className="mt-1 text-sm text-warm-olive">{t("farmer:farmDetailsBody")}</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <FormError message={error} />}
          {success && <FormSuccess message={success} />}

          <FormField label={t("farmer:farmNameLabel")} htmlFor="farm-name">
            <input
              id="farm-name"
              type="text"
              required
              maxLength={FARM_NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </FormField>

          <FormField label={t("farmer:farmAddressLabel")} htmlFor="farm-address">
            <input
              id="farm-address"
              type="text"
              required
              maxLength={FARM_ADDRESS_MAX}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
            />
          </FormField>

          <FormField label={t("farmer:farmDescriptionLabel")} htmlFor="farm-description">
            <textarea
              id="farm-description"
              rows={4}
              maxLength={FARM_DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("farmer:farmDescriptionPlaceholder")}
              className={inputClass}
            />
          </FormField>

          <FormField label={t("farmer:farmFoundedAtLabel")} htmlFor="farm-founded-at">
            <input
              id="farm-founded-at"
              type="date"
              max={today}
              value={foundedAt}
              onChange={(e) => setFoundedAt(e.target.value)}
              className={inputClass}
            />
          </FormField>

          <button type="submit" disabled={saving} className={`${primaryButtonClass} px-6`}>
            {saving ? t("farmer:farmSaving") : t("farmer:farmSave")}
          </button>
        </form>
      </section>

      <section id="crop-rates" className="mt-8 scroll-mt-6">
        <h2 className="text-sm font-semibold tracking-wide text-warm-olive uppercase">{t("farmer:cropRatesHeading")}</h2>
        <p className="mt-1 text-sm text-warm-olive">{t("farmer:cropRatesInstructions")}</p>

        {existingRates.length === 0 && (
          <p role="alert" className="mt-4 rounded-lg border border-wood/40 bg-wood/10 px-4 py-3 text-sm text-wood">
            {t("farmer:cropRatesRequiredNotice")}
          </p>
        )}

        {catalog.length === 0 ? (
          <p className="mt-6 text-sm text-wood">{t("farmer:noCropsInCatalog")}</p>
        ) : (
          <form onSubmit={handleSaveRates} className="mt-4 space-y-4">
            {ratesError && <FormError message={ratesError} />}
            {ratesSuccess && <FormSuccess message={t("farmer:cropRatesSaved")} />}

            <ul className="space-y-3">
              {catalog.map((crop: Crop) => (
                <li key={crop.id}>
                  <FormField
                    label={t("farmer:cropDuration", { name: getCropName(crop, i18nInstance.language), months: crop.durationMonths })}
                    htmlFor={`rate-${crop.id}`}
                  >
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

            <button type="submit" disabled={ratesSaving} className={`${submitClass} w-auto px-4 py-2 text-sm`}>
              {ratesSaving ? t("farmer:savingCropRates") : t("farmer:saveCropRates")}
            </button>
          </form>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-warm-olive uppercase">{t("common:language")}</h2>
        <div className="mt-2 grid grid-cols-2 gap-3" role="group" aria-label={t("common:language")}>
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              aria-pressed={currentLanguage === code}
              onClick={() => i18nInstance.changeLanguage(code)}
              className={languagePillClass(currentLanguage === code)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-8">
        <LogoutButton className={logoutButtonClass} />
      </div>

      <DeleteAccountSection role={account.role} />
    </main>
  );
}
