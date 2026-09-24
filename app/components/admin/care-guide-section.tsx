import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Crop } from "~/lib/admin";
import {
  createCareInstruction,
  deleteCareInstruction,
  listCareInstructions,
  updateCareInstruction,
  type CareInstruction,
} from "~/lib/care";
import { ApiError } from "~/lib/api-client";
import { Field as FormField, FormError, FormSuccess, inputClass, primaryButtonClass, secondaryButtonClass } from "~/components/form";

/**
 * Authoring for the weekly care guide (backend #44): the instructions a tenant
 * reads on their plot page, one crop at a time.
 *
 * It sits on the crop catalog page rather than getting its own nav entry
 * because the guide hangs off a crop — the catalog is admin-owned, and so is
 * the advice attached to it. A farmer can read a crop's guide through the same
 * endpoint but cannot write it; what is farm-specific is an announcement.
 *
 * `week` is a week of a *tenant's rental*, not a calendar week: week 1 is the
 * first seven days after they book. The backend caps it at 104.
 */
export function CareGuideSection({ crops }: { crops: Crop[] }) {
  const { t } = useTranslation("admin");
  const [cropId, setCropId] = useState(crops[0]?.id ?? "");
  const [instructions, setInstructions] = useState<CareInstruction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [week, setWeek] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Which instruction's Delete button is armed and waiting for a second click. */
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!cropId) return;

    // A slow response for a crop the admin has already switched away from must
    // not overwrite the newer one's guide.
    let current = true;
    setLoading(true);
    setError(null);
    listCareInstructions(cropId)
      .then((loaded) => {
        if (current) setInstructions(loaded);
      })
      .catch((err) => {
        if (current) setError(err instanceof ApiError ? err.message : String(err));
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [cropId]);

  function resetForm() {
    setEditingId(null);
    setWeek("");
    setTitle("");
    setBody("");
  }

  function startEditing(instruction: CareInstruction) {
    setEditingId(instruction.id);
    setWeek(String(instruction.week));
    setTitle(instruction.title);
    setBody(instruction.body);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedWeek = Number(week);
    if (!Number.isInteger(parsedWeek) || parsedWeek < 1 || parsedWeek > 104) {
      setError(t("careWeekInvalid"));
      return;
    }

    const input = { week: parsedWeek, title: title.trim(), body: body.trim() };
    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateCareInstruction(editingId, input);
        setInstructions((prev) => sortByWeek(prev.map((i) => (i.id === updated.id ? updated : i))));
        setSuccess(t("careInstructionUpdated"));
      } else {
        const created = await createCareInstruction(cropId, input);
        setInstructions((prev) => sortByWeek([...prev, created]));
        setSuccess(t("careInstructionAdded"));
      }
      resetForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(instruction: CareInstruction) {
    setError(null);
    setSuccess(null);
    setPendingDeleteId(null);
    try {
      await deleteCareInstruction(instruction.id);
      setInstructions((prev) => prev.filter((i) => i.id !== instruction.id));
      if (editingId === instruction.id) resetForm();
      setSuccess(t("careInstructionDeleted"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  if (crops.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold text-forest">{t("careGuideHeading")}</h2>
        <p className="mt-2 text-sm text-warm-olive">{t("careGuideNoCrops")}</p>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="font-serif text-xl font-semibold text-forest">{t("careGuideHeading")}</h2>
      <p className="mt-1 text-sm text-warm-olive">{t("careGuideBody")}</p>

      <div className="mt-4 max-w-sm">
        <FormField label={t("careCropLabel")} htmlFor="care-crop">
          <select
            id="care-crop"
            value={cropId}
            onChange={(e) => {
              setCropId(e.target.value);
              resetForm();
              setSuccess(null);
            }}
            className={inputClass}
          >
            {crops.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.name}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-warm-olive">{t("careLoading")}</p>
      ) : instructions.length === 0 ? (
        <p className="mt-4 text-sm text-warm-olive">{t("careNoInstructions")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-beige rounded-2xl border border-beige bg-cream shadow-sm">
          {instructions.map((instruction) => (
            <li key={instruction.id} className="flex items-start justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-widest text-moss uppercase">
                  {t("careWeekLabelShort", { week: instruction.week })}
                </p>
                <p className="mt-1 font-medium text-forest">{instruction.title}</p>
                <p className="mt-1 text-sm text-wood">{instruction.body}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEditing(instruction)}
                  className="rounded px-2 py-1 text-xs font-medium text-wood hover:bg-beige/50"
                >
                  {t("careEdit")}
                </button>
                {/* Two-click delete, matching the crop list: no window.confirm,
                    which is unstyled and can't be translated. */}
                {pendingDeleteId === instruction.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDelete(instruction)}
                      className="rounded bg-error px-2 py-1 text-xs font-medium text-ivory hover:opacity-90"
                    >
                      {t("cropDeleteConfirm")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(null)}
                      className="rounded px-2 py-1 text-xs font-medium text-wood hover:bg-beige/50"
                    >
                      {t("cropDeleteCancel")}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(instruction.id)}
                    className="rounded px-2 py-1 text-xs font-medium text-error hover:bg-error/10"
                  >
                    {t("cropDelete")}
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="mt-4 max-w-sm space-y-4">
        {error && <FormError message={error} />}
        {success && <FormSuccess message={success} />}

        <FormField label={t("careWeekLabel")} htmlFor="care-week">
          <input
            id="care-week"
            type="number"
            required
            min={1}
            max={104}
            step={1}
            inputMode="numeric"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className={inputClass}
          />
        </FormField>

        <FormField label={t("careTitleLabel")} htmlFor="care-title">
          <input
            id="care-title"
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("careTitlePlaceholder")}
            className={inputClass}
          />
        </FormField>

        <FormField label={t("careBodyLabel")} htmlFor="care-body">
          <textarea
            id="care-body"
            required
            rows={3}
            maxLength={5000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("careBodyPlaceholder")}
            className={inputClass}
          />
        </FormField>

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className={`${primaryButtonClass} px-6 py-2 text-sm`}>
            {saving ? t("careSaving") : editingId ? t("careSaveEdit") : t("careAdd")}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className={`${secondaryButtonClass} px-6 py-2 text-sm`}>
              {t("careCancelEdit")}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

/** Keeps the list in the week order the backend returns it in after a local edit. */
function sortByWeek(instructions: CareInstruction[]): CareInstruction[] {
  return [...instructions].sort((a, b) => a.week - b.week);
}
