import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Crop } from "~/lib/fields";
import {
  createCareInstruction,
  deleteCareInstruction,
  listCareInstructions,
  resetFarmCareGuide,
  updateCareInstruction,
  type CareGuideSource,
  type CareInstruction,
} from "~/lib/care";
import { ApiError } from "~/lib/api-client";
import { Field as FormField, FormError, FormSuccess, inputClass, primaryButtonClass, secondaryButtonClass } from "~/components/form";

/**
 * Authoring for the weekly care guide (backend #44, #68): the instructions a
 * tenant reads on their plot page, one crop at a time.
 *
 * - As an **admin** (on `/admin/crops`) it edits the crop's **default guide**,
 *   the one every farm starts from.
 * - As a **farmer** (on `/farmer/care-guide`) it edits the version the
 *   farmer's own tenants read. Until the farmer changes anything that is the
 *   default; the first write copies it into a version of their own, which
 *   they can reset to the default again.
 *
 * A farmer's first write replaces every step's id (the steps are now the
 * farm's copies), so after a farmer's write the guide is reloaded rather than
 * patched in place. An admin's writes never move ids, so the list is patched.
 *
 * `week` is a week of a *tenant's rental*, not a calendar week: week 1 is the
 * first seven days after they book. The backend caps it at 104.
 *
 * The shared labels live in the `admin` namespace, where the editor started;
 * the farmer-only ones (version badge, reset) in `farmer`.
 */
export function CareGuideEditor({ crops, role }: { crops: Crop[]; role: "admin" | "farmer" }) {
  const { t } = useTranslation("admin");
  const { t: tFarmer } = useTranslation("farmer");
  const [cropId, setCropId] = useState(crops[0]?.id ?? "");
  const [instructions, setInstructions] = useState<CareInstruction[]>([]);
  const [source, setSource] = useState<CareGuideSource>("default");
  /** Bumped to refetch the current crop's guide after a farmer's write. */
  const [reloadKey, setReloadKey] = useState(0);
  /** The crop whose guide is on screen; a reload of the same crop keeps it visible. */
  const [loadedCropId, setLoadedCropId] = useState<string | null>(null);
  const [pendingReset, setPendingReset] = useState(false);
  const [resetting, setResetting] = useState(false);
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

    // A slow response for a crop the editor has already switched away from
    // must not overwrite the newer one's guide.
    let current = true;
    listCareInstructions(cropId)
      .then((loaded) => {
        if (!current) return;
        setInstructions(loaded.instructions);
        setSource(loaded.source);
        setLoadedCropId(cropId);
      })
      .catch((err) => {
        if (!current) return;
        // Settle on an empty list next to the error rather than a "loading"
        // line that would never go away.
        setInstructions([]);
        setLoadedCropId(cropId);
        setError(err instanceof ApiError ? err.message : String(err));
      });

    return () => {
      current = false;
    };
  }, [cropId, reloadKey]);

  const loading = loadedCropId !== cropId;

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
      if (role === "farmer") {
        if (editingId) {
          await updateCareInstruction(editingId, input);
        } else {
          await createCareInstruction(cropId, input);
        }
        setSuccess(editingId ? t("careInstructionUpdated") : t("careInstructionAdded"));
        setReloadKey((key) => key + 1);
      } else if (editingId) {
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
      if (role === "farmer") {
        setReloadKey((key) => key + 1);
      } else {
        setInstructions((prev) => prev.filter((i) => i.id !== instruction.id));
      }
      if (editingId === instruction.id) resetForm();
      setSuccess(t("careInstructionDeleted"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function handleReset() {
    setError(null);
    setSuccess(null);
    setPendingReset(false);
    setResetting(true);
    try {
      await resetFarmCareGuide(cropId);
      resetForm();
      setSuccess(tFarmer("careResetDone"));
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setResetting(false);
    }
  }

  if (crops.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold text-forest">{t("careGuideHeading")}</h2>
        <p className="mt-2 text-sm text-warm-olive">
          {role === "farmer" ? tFarmer("careGuideNoCrops") : t("careGuideNoCrops")}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="font-serif text-xl font-semibold text-forest">{t("careGuideHeading")}</h2>
      <p className="mt-1 text-sm text-warm-olive">
        {role === "farmer" ? tFarmer("careGuideBody") : t("careGuideBody")}
      </p>

      <div className="mt-4 max-w-sm">
        <FormField label={t("careCropLabel")} htmlFor="care-crop">
          <select
            id="care-crop"
            value={cropId}
            onChange={(e) => {
              setCropId(e.target.value);
              resetForm();
              setError(null);
              setSuccess(null);
              setPendingReset(false);
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

      {role === "farmer" && !loading && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-beige bg-cream px-5 py-3 shadow-sm">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              source === "farm" ? "bg-moss/15 text-moss" : "bg-beige text-wood"
            }`}
          >
            {source === "farm" ? tFarmer("careSourceFarmBadge") : tFarmer("careSourceDefaultBadge")}
          </span>
          <p className="min-w-0 flex-1 text-sm text-wood">
            {source === "farm" ? tFarmer("careSourceFarmHint") : tFarmer("careSourceDefaultHint")}
          </p>
          {source === "farm" &&
            (pendingReset ? (
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded bg-error px-2 py-1 text-xs font-medium text-ivory hover:opacity-90"
                >
                  {tFarmer("careResetConfirm")}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingReset(false)}
                  className="rounded px-2 py-1 text-xs font-medium text-wood hover:bg-beige/50"
                >
                  {t("cropDeleteCancel")}
                </button>
              </span>
            ) : (
              <button
                type="button"
                disabled={resetting}
                onClick={() => setPendingReset(true)}
                className="rounded px-2 py-1 text-xs font-medium text-error hover:bg-error/10"
              >
                {tFarmer("careReset")}
              </button>
            ))}
        </div>
      )}

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
