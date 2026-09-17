import { useState } from "react";
import { useTranslation } from "react-i18next";
import { broadcastNotification } from "~/lib/admin";
import { ApiError } from "~/lib/api-client";
import { Field as FormField, FormError, inputClass, secondaryButtonClass, submitClass } from "~/components/form";

export function BroadcastSection() {
  const { t } = useTranslation("admin");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  /** True once the form has been submitted and is waiting for confirmation. */
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // This mails every farmer and customer on the platform and can't be
    // recalled, so the first submit only asks; the confirm button below sends.
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setSending(true);
    try {
      const result = await broadcastNotification(subject.trim(), body.trim());
      setSuccess(t("notifSuccess", { recipients: result.recipients }));
      setSubject("");
      setBody("");
      setConfirming(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <section>
      <form onSubmit={handleSubmit} className="mt-4 max-w-lg space-y-4">
        {error && <FormError message={error} />}
        {success && (
          <p
            role="status"
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
          >
            {success}
          </p>
        )}

        <FormField label={t("notifSubjectLabel")} htmlFor="notif-subject">
          <input
            id="notif-subject"
            type="text"
            required
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setConfirming(false);
            }}
            placeholder={t("notifSubjectPlaceholder")}
            className={inputClass}
          />
        </FormField>

        <FormField label={t("notifBodyLabel")} htmlFor="notif-body">
          <textarea
            id="notif-body"
            required
            rows={4}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setConfirming(false);
            }}
            placeholder={t("notifBodyPlaceholder")}
            className={`${inputClass} resize-y`}
          />
        </FormField>

        {confirming ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
            <p className="text-sm text-amber-900 dark:text-amber-100">{t("notifConfirmPrompt")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="submit" disabled={sending} className={`${submitClass} w-auto px-6 py-2 text-sm`}>
                {sending ? t("notifSending") : t("notifConfirmSend")}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className={`${secondaryButtonClass} w-auto px-6 py-2 text-sm`}
              >
                {t("notifCancel")}
              </button>
            </div>
          </div>
        ) : (
          <button type="submit" className={`${submitClass} w-auto px-6 py-2 text-sm`}>
            {t("notifSend")}
          </button>
        )}
      </form>
    </section>
  );
}
