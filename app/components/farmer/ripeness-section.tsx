import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createRipenessNotice } from "~/lib/ripeness";
import { ApiError } from "~/lib/api-client";
import type { Crop, FieldWithPlots } from "~/lib/fields";
import { FormError, FormSuccess, inputClass, submitClass } from "~/components/form";

type RipenessSectionProps = {
  fields: FieldWithPlots[];
};

/** Every crop offered by at least one of the field's plots, deduped, sorted by name. */
function cropsOfferedByField(field: FieldWithPlots): Crop[] {
  const byId = new Map<string, Crop>();
  for (const plot of field.plots) {
    for (const crop of plot.crops) {
      byId.set(crop.id, crop);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Ready-to-harvest notice compose form (issue #39 / backend issue #33): pick
 * a field and a crop it offers, mail everyone currently renting a plot of
 * that field with that crop. No history list here — unlike announcements, a
 * ripeness notice has no read-back endpoint of its own (see lib/ripeness.ts).
 */
export function RipenessSection({ fields }: RipenessSectionProps) {
  const { t } = useTranslation("farmer");
  const [fieldId, setFieldId] = useState(fields[0]?.id ?? "");
  const [cropId, setCropId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const field = fields.find((f) => f.id === fieldId);
  const crops = useMemo(() => (field ? cropsOfferedByField(field) : []), [field]);
  const selectedCropId = crops.some((c) => c.id === cropId) ? cropId : (crops[0]?.id ?? "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!field || !selectedCropId) return;
    setError(null);
    setSuccess(null);
    setSending(true);
    try {
      const result = await createRipenessNotice(field.id, selectedCropId);
      setSuccess(t("ripenessSuccess", { recipients: result.recipients }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  const hasFields = fields.length > 0;

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("ripenessSectionTitle")}</h2>

      {!hasFields ? (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("ripenessNoFieldsYet")}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("ripenessSectionBody")}</p>

          <form onSubmit={handleSubmit} className="mt-4 max-w-lg space-y-4">
            {error && <FormError message={error} />}
            {success && <FormSuccess message={success} />}

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label={t("ripenessChooseField")}
                value={fieldId}
                onChange={(e) => {
                  setFieldId(e.target.value);
                  setCropId("");
                }}
                disabled={sending}
                className={`${inputClass} w-auto py-2`}
              >
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>

              {crops.length > 0 && (
                <select
                  aria-label={t("ripenessChooseCrop")}
                  value={selectedCropId}
                  onChange={(e) => setCropId(e.target.value)}
                  disabled={sending}
                  className={`${inputClass} w-auto py-2`}
                >
                  {crops.map((crop) => (
                    <option key={crop.id} value={crop.id}>
                      {crop.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="submit"
                disabled={sending || crops.length === 0}
                className={`${submitClass} w-auto px-4 py-2 text-sm`}
              >
                {sending ? t("ripenessSending") : t("ripenessSend")}
              </button>
            </div>

            {crops.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("ripenessNoCropsForField")}</p>
            )}
          </form>
        </>
      )}
    </section>
  );
}
