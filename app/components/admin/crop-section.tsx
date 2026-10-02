import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createCrop, deleteCrop, updateCrop, type Crop } from "~/lib/admin";
import { ApiError } from "~/lib/api-client";
import { getCropName } from "~/lib/fields";
import { Field as FormField, FormError, FormSuccess, inputClass, primaryButtonClass } from "~/components/form";

export function CropSection({ initialCrops }: { initialCrops: Crop[] }) {
  const { t, i18n } = useTranslation("admin");
  const [nameDe, setNameDe] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [months, setMonths] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /** Which crop's Delete button is armed and waiting for a second click. */
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  /** Which crop is currently shown as an inline edit form instead of a row. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameDe, setEditNameDe] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editMonths, setEditMonths] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cropList, setCropList] = useState<Crop[]>(initialCrops);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const m = Number(months);
    if (!Number.isInteger(m) || m < 1) {
      setError(t("cropDurationInvalid"));
      return;
    }

    setAdding(true);
    try {
      const crop = await createCrop(nameDe.trim(), nameEn.trim(), m);
      setCropList((prev) => [...prev, crop]);
      setSuccess(t("cropAddedSuccess", { name: getCropName(crop, i18n.language) }));
      setNameDe("");
      setNameEn("");
      setMonths("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }

  function startEdit(crop: Crop) {
    setError(null);
    setSuccess(null);
    setPendingDeleteId(null);
    setEditingId(crop.id);
    setEditNameDe(crop.nameDe);
    setEditNameEn(crop.nameEn);
    setEditMonths(String(crop.durationMonths));
  }

  async function handleSave(crop: Crop) {
    setError(null);
    setSuccess(null);

    const m = Number(editMonths);
    if (!Number.isInteger(m) || m < 1) {
      setError(t("cropDurationInvalid"));
      return;
    }

    setSaving(true);
    try {
      const updated = await updateCrop(crop.id, editNameDe.trim(), editNameEn.trim(), m);
      setCropList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSuccess(t("cropUpdatedSuccess", { name: getCropName(updated, i18n.language) }));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(crop: Crop) {
    setError(null);
    setSuccess(null);
    setPendingDeleteId(null);
    setDeletingId(crop.id);
    try {
      await deleteCrop(crop.id);
      setCropList((prev) => prev.filter((c) => c.id !== crop.id));
      setSuccess(t("cropDeletedSuccess", { name: getCropName(crop, i18n.language) }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t("cropDeleteConflict", { name: getCropName(crop, i18n.language) }));
      } else {
        setError(err instanceof ApiError ? err.message : String(err));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section>
      {cropList.length > 0 && (
        <ul className="mt-4 divide-y divide-beige rounded-lg border border-beige">
          {cropList.map((crop) =>
            editingId === crop.id ? (
              <li key={crop.id} className="space-y-3 px-4 py-3">
                {error && <FormError message={error} />}
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    required
                    value={editNameDe}
                    onChange={(e) => setEditNameDe(e.target.value)}
                    placeholder={t("cropNameDePlaceholder")}
                    aria-label={t("cropNameDeLabel")}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    required
                    value={editNameEn}
                    onChange={(e) => setEditNameEn(e.target.value)}
                    placeholder={t("cropNameEnPlaceholder")}
                    aria-label={t("cropNameEnLabel")}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    required
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={editMonths}
                    onChange={(e) => setEditMonths(e.target.value)}
                    aria-label={t("cropDurationLabel")}
                    className={inputClass}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave(crop)}
                    className="rounded bg-moss px-3 py-1 text-xs font-medium text-ivory hover:bg-olive disabled:opacity-50"
                  >
                    {saving ? t("cropSaving") : t("cropSave")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded px-3 py-1 text-xs font-medium text-wood hover:bg-cream"
                  >
                    {t("cropEditCancel")}
                  </button>
                </div>
              </li>
            ) : (
              <li key={crop.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-wood">
                  {t("cropDuration", { name: getCropName(crop, i18n.language), months: crop.durationMonths })}
                </span>
                {/* Deleting a crop is platform-wide and immediate, so the first
                    click only arms the button — the second one deletes. Inline
                    rather than window.confirm, which is unstyled and can't be
                    translated. */}
                {pendingDeleteId === crop.id ? (
                  <span className="ml-4 flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={deletingId === crop.id}
                      onClick={() => handleDelete(crop)}
                      className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingId === crop.id ? t("cropDeleting") : t("cropDeleteConfirm")}
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
                  <span className="ml-4 flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(crop)}
                      className="rounded px-2 py-1 text-xs font-medium text-wood hover:bg-cream"
                    >
                      {t("cropEdit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(crop.id)}
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      {t("cropDelete")}
                    </button>
                  </span>
                )}
              </li>
            ),
          )}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="mt-4 max-w-sm space-y-4">
        {error && !editingId && <FormError message={error} />}
        {success && <FormSuccess message={success} />}

        <FormField label={t("cropNameDeLabel")} htmlFor="crop-name-de">
          <input
            id="crop-name-de"
            type="text"
            required
            value={nameDe}
            onChange={(e) => setNameDe(e.target.value)}
            placeholder={t("cropNameDePlaceholder")}
            className={inputClass}
          />
        </FormField>

        <FormField label={t("cropNameEnLabel")} htmlFor="crop-name-en">
          <input
            id="crop-name-en"
            type="text"
            required
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder={t("cropNameEnPlaceholder")}
            className={inputClass}
          />
        </FormField>

        <FormField label={t("cropDurationLabel")} htmlFor="crop-months">
          <input
            id="crop-months"
            type="number"
            required
            min={1}
            step={1}
            inputMode="numeric"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className={inputClass}
          />
        </FormField>

        <button type="submit" disabled={adding} className={`${primaryButtonClass} px-6 py-2 text-sm`}>
          {adding ? t("cropAdding") : t("cropAdd")}
        </button>
      </form>
    </section>
  );
}
