import { useState } from "react";
import { Link, useRouteLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/settings";
import type { clientLoader as farmerLayoutLoader } from "./layout";
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
import { Field as FormField, FormError, FormSuccess, inputClass, primaryButtonClass } from "~/components/form";
import { LogoutButton } from "~/components/logout-button";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:settingsMetaTitle") }];
}

/**
 * The farmer's "My farm" page (issue #68): their counterpart to the tenant's
 * Me page, reached from the sidebar, the mobile "Me" tab and the name in the
 * header. The account itself comes from the layout's loader; the farm from
 * GET /api/farms/me (backend #71), which resolves it from the caller.
 */
export async function clientLoader() {
  const farm = await getMyFarm();
  return { farm };
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

export default function FarmerMyFarm({ loaderData }: Route.ComponentProps) {
  const account = useRouteLoaderData<typeof farmerLayoutLoader>("farmer-layout")?.account;
  const { t, i18n: i18nInstance } = useTranslation(["farmer", "auth", "common"]);
  const currentLanguage = i18nInstance.language.startsWith("de") ? "de" : "en";
  const numberLocale = currentLanguage === "de" ? "de-DE" : "en-GB";

  const [farm, setFarm] = useState<Farm>(loaderData.farm);
  const [name, setName] = useState(farm.name);
  const [address, setAddress] = useState(farm.address);
  const [description, setDescription] = useState(farm.description);
  const [foundedAt, setFoundedAt] = useState(farm.foundedAt ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const today = localToday();

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

  if (!account) return null;

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold text-forest">{t("farmer:settingsTitle")}</h1>
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
    </main>
  );
}
