import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createCrop, deleteCrop, type Crop } from "~/lib/admin";
import { ApiError } from "~/lib/api-client";
import { Field as FormField, FormError, inputClass, primaryButtonClass } from "~/components/form";

export function CropSection({ initialCrops }: { initialCrops: Crop[] }) {
  const { t } = useTranslation("admin");
  const [name, setName] = useState("");
  const [months, setMonths] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /** Which crop's Delete button is armed and waiting for a second click. */
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
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
      const crop = await createCrop(name.trim(), m);
      setCropList((prev) => [...prev, crop]);
      setSuccess(t("cropAddedSuccess", { name: crop.name }));
      setName("");
      setMonths("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setAdding(false);
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
      setSuccess(t("cropDeletedSuccess", { name: crop.name }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t("cropDeleteConflict", { name: crop.name }));
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
        <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {cropList.map((crop) => (
            <li key={crop.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-700 dark:text-gray-200">
                {t("cropDuration", { name: crop.name, months: crop.durationMonths })}
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
                    className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {t("cropDeleteCancel")}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(crop.id)}
                  className="ml-4 shrink-0 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  {t("cropDelete")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="mt-4 max-w-sm space-y-4">
        {error && <FormError message={error} />}
        {success && (
          <p
            role="status"
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
          >
            {success}
          </p>
        )}

        <FormField label={t("cropNameLabel")} htmlFor="crop-name">
          <input
            id="crop-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("cropNamePlaceholder")}
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
