import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { createSeason, deleteSeason, formatSeasonWindow, monthNames, type Season } from "~/lib/seasons";
import { ApiError } from "~/lib/api-client";
import { Field as FormField, FormError, FormSuccess, inputClass, primaryButtonClass } from "~/components/form";

/**
 * One table of every season visible to the caller, plus the add-season
 * form: the platform-wide defaults for an admin (`/admin/seasons`, all
 * deletable), or a farmer's defaults-and-own union (`/farmer/seasons`,
 * where only the farmer's own rows — `season.farmId !== null` — get a
 * Delete button; a default row is shown the same way but with none, since
 * a farmer can't edit or delete it through these endpoints). `role`
 * decides which rows are deletable; `onOwnSeasonsChange` lets a farmer
 * page keep its own-seasons list in sync for the crop assignment picker.
 */
export function SeasonSection({
  role,
  initialSeasons,
  onOwnSeasonsChange,
}: {
  role: "admin" | "farmer";
  initialSeasons: Season[];
  onOwnSeasonsChange?: (seasons: Season[]) => void;
}) {
  const { t, i18n } = useTranslation("admin");
  const locale = i18n.language.startsWith("de") ? "de-DE" : "en-GB";
  const months = monthNames(locale);
  const [name, setName] = useState("");
  const [startDay, setStartDay] = useState(1);
  const [startMonth, setStartMonth] = useState(3);
  const [endDay, setEndDay] = useState(31);
  const [endMonth, setEndMonth] = useState(5);
  const [adding, setAdding] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>(initialSeasons);
  const [formOpen, setFormOpen] = useState(false);

  function updateSeasons(next: Season[]) {
    setSeasons(next);
    onOwnSeasonsChange?.(next.filter((s) => s.farmId !== null));
  }

  function canDelete(season: Season): boolean {
    return role === "admin" || season.farmId !== null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError(t("seasonNameInvalid"));
      return;
    }

    setAdding(true);
    try {
      const season = await createSeason({ name: name.trim(), startMonth, startDay, endMonth, endDay });
      updateSeasons([...seasons, season]);
      setSuccess(t("seasonAddedSuccess", { name: season.name }));
      setName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(season: Season) {
    setError(null);
    setSuccess(null);
    setPendingDeleteId(null);
    setDeletingId(season.id);
    try {
      await deleteSeason(season.id);
      updateSeasons(seasons.filter((s) => s.id !== season.id));
      setSuccess(t("seasonDeletedSuccess", { name: season.name }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t("seasonDeleteConflict", { name: season.name }));
      } else {
        setError(err instanceof ApiError ? err.message : String(err));
      }
    } finally {
      setDeletingId(null);
    }
  }

  const sorted = [...seasons].sort((a, b) => a.startMonth * 100 + a.startDay - (b.startMonth * 100 + b.startDay));

  return (
    <section>
      {sorted.length > 0 && (
        <table className="mt-4 w-full border-collapse overflow-hidden rounded-lg border border-beige text-sm">
          <thead>
            <tr className="bg-cream text-left text-xs font-semibold tracking-wide text-warm-olive uppercase">
              <th className="px-4 py-2">{t("seasonTableName")}</th>
              <th className="px-4 py-2">{t("seasonTableWindow")}</th>
              <th className="px-4 py-2 text-right">{t("seasonTableAction")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-beige">
            {sorted.map((season) => (
              <tr key={season.id}>
                <td className="px-4 py-3 text-wood">
                  {season.name}
                  {season.farmId === null && (
                    <span className="ml-2 text-xs font-normal text-warm-olive">({t("seasonAssignDefaultSuffix")})</span>
                  )}
                </td>
                <td className="px-4 py-3 text-wood">{formatSeasonWindow(season, locale)}</td>
                <td className="px-4 py-3 text-right">
                  {canDelete(season) &&
                    (pendingDeleteId === season.id ? (
                      <span className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          disabled={deletingId === season.id}
                          onClick={() => handleDelete(season)}
                          className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {deletingId === season.id ? t("cropDeleting") : t("cropDeleteConfirm")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(null)}
                          className="rounded px-2 py-1 text-xs font-medium text-wood hover:bg-cream"
                        >
                          {t("cropDeleteCancel")}
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(season.id)}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        {t("cropDelete")}
                      </button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        type="button"
        onClick={() => setFormOpen((open) => !open)}
        aria-expanded={formOpen}
        className="mt-4 flex items-center gap-1 text-sm font-medium text-moss hover:text-olive"
      >
        {formOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {t("seasonAdd")}
      </button>

      {formOpen && (
        <form onSubmit={handleSubmit} className="mt-4 max-w-sm space-y-4">
          {error && <FormError message={error} />}
          {success && <FormSuccess message={success} />}

          <FormField label={t("seasonNameLabel")} htmlFor="season-name">
            <input
              id="season-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("seasonNamePlaceholder")}
              className={inputClass}
            />
          </FormField>

          <FormField label={t("seasonStartLabel")} htmlFor="season-start-day">
            <div className="flex gap-2">
              <input
                id="season-start-day"
                type="number"
                required
                min={1}
                max={31}
                step={1}
                inputMode="numeric"
                value={startDay}
                onChange={(e) => setStartDay(Number(e.target.value))}
                className="w-20 shrink-0 rounded-lg border border-beige bg-ivory px-4 py-3 text-base text-forest focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss"
              />
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(Number(e.target.value))}
                className="min-w-0 flex-1 rounded-lg border border-beige bg-ivory px-4 py-3 text-base text-forest focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss"
              >
                {months.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </FormField>

          <FormField label={t("seasonEndLabel")} htmlFor="season-end-day">
            <div className="flex gap-2">
              <input
                id="season-end-day"
                type="number"
                required
                min={1}
                max={31}
                step={1}
                inputMode="numeric"
                value={endDay}
                onChange={(e) => setEndDay(Number(e.target.value))}
                className="w-20 shrink-0 rounded-lg border border-beige bg-ivory px-4 py-3 text-base text-forest focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss"
              />
              <select
                value={endMonth}
                onChange={(e) => setEndMonth(Number(e.target.value))}
                className="min-w-0 flex-1 rounded-lg border border-beige bg-ivory px-4 py-3 text-base text-forest focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss"
              >
                {months.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </FormField>

          <button type="submit" disabled={adding} className={`${primaryButtonClass} px-6 py-2 text-sm`}>
            {adding ? t("seasonAdding") : t("seasonAdd")}
          </button>
        </form>
      )}
    </section>
  );
}
