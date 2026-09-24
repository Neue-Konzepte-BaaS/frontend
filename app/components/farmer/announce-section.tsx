import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createAnnouncement, type Announcement } from "~/lib/announcements";
import { ApiError } from "~/lib/api-client";
import type { FieldWithPlots } from "~/lib/fields";
import { Field as FormField, FormError, FormSuccess, inputClass, submitClass } from "~/components/form";

type Scope = "all" | "field" | "plot";

type AnnounceSectionProps = {
  fields: FieldWithPlots[];
  /** Fired after a successful post, so the board's history list can prepend it. */
  onPosted: (announcement: Announcement) => void;
};

/**
 * The compose half of the farmer's board (issue #39): post a notice to every
 * current tenant, or narrow it to one field or one plot. Mirrors
 * admin/broadcast-section.tsx's shape (trim-on-submit, disable while
 * sending, inline success/error banner) with the scope radio group added.
 */
export function AnnounceSection({ fields, onPosted }: AnnounceSectionProps) {
  const { t } = useTranslation("farmer");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [fieldId, setFieldId] = useState(fields[0]?.id ?? "");

  const plots = fields.flatMap((field) => field.plots.map((plot) => ({ id: plot.id, name: plot.name, fieldName: field.name })));
  const [plotId, setPlotId] = useState(plots[0]?.id ?? "");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSending(true);
    try {
      const result = await createAnnouncement({
        subject: subject.trim(),
        body: body.trim(),
        fieldId: scope === "field" ? fieldId : undefined,
        plotId: scope === "plot" ? plotId : undefined,
      });
      setSuccess(t("announceSuccess", { recipients: result.recipients }));
      setSubject("");
      setBody("");
      onPosted(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  const hasFields = fields.length > 0;
  const hasPlots = plots.length > 0;
  const scopeIncomplete = (scope === "field" && !fieldId) || (scope === "plot" && !plotId);
  // HTML's `required` only blocks the literal empty string, not whitespace —
  // without this, a subject/body of only spaces would pass validation and
  // get trimmed to "" right before the request, submitting an empty post.
  const textIncomplete = subject.trim() === "" || body.trim() === "";

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("announceSectionTitle")}</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("announceSectionBody")}</p>

      <form onSubmit={handleSubmit} className="mt-4 max-w-lg space-y-4">
        {error && <FormError message={error} />}
        {success && <FormSuccess message={success} />}

        <FormField label={t("announceSubjectLabel")} htmlFor="announce-subject">
          <input
            id="announce-subject"
            type="text"
            required
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("announceSubjectPlaceholder")}
            className={inputClass}
          />
        </FormField>

        <FormField label={t("announceBodyLabel")} htmlFor="announce-body">
          <textarea
            id="announce-body"
            required
            rows={4}
            maxLength={10000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("announceBodyPlaceholder")}
            className={`${inputClass} resize-y`}
          />
        </FormField>

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">{t("announceScopeLabel")}</legend>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="radio"
                name="announce-scope"
                checked={scope === "all"}
                onChange={() => setScope("all")}
                disabled={sending}
                className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-700"
              />
              {t("announceScopeAll")}
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="radio"
                name="announce-scope"
                checked={scope === "field"}
                onChange={() => setScope("field")}
                disabled={!hasFields || sending}
                className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-700"
              />
              {t("announceScopeField")}
            </label>
            {scope === "field" && hasFields && (
              <select
                aria-label={t("announceChooseField")}
                value={fieldId}
                onChange={(e) => setFieldId(e.target.value)}
                disabled={sending}
                className={`${inputClass} ml-6 w-auto py-2`}
              >
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
              </select>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="radio"
                name="announce-scope"
                checked={scope === "plot"}
                onChange={() => setScope("plot")}
                disabled={!hasPlots || sending}
                className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-700"
              />
              {t("announceScopePlot")}
            </label>
            {scope === "plot" && hasPlots && (
              <select
                aria-label={t("announceChoosePlot")}
                value={plotId}
                onChange={(e) => setPlotId(e.target.value)}
                disabled={sending}
                className={`${inputClass} ml-6 w-auto py-2`}
              >
                {plots.map((plot) => (
                  <option key={plot.id} value={plot.id}>
                    {plot.fieldName} – {plot.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={sending || scopeIncomplete || textIncomplete}
          className={`${submitClass} w-auto px-6 py-2 text-sm`}
        >
          {sending ? t("announceSending") : t("announceSend")}
        </button>
      </form>
    </section>
  );
}
