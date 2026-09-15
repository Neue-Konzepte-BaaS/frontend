import { useState } from "react";
import { useTranslation } from "react-i18next";
import { broadcastNotification } from "~/lib/admin";
import { ApiError } from "~/lib/api-client";
import { Field as FormField, FormError, inputClass, submitClass } from "~/components/form";

export function BroadcastSection() {
  const { t } = useTranslation("admin");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSending(true);
    try {
      const result = await broadcastNotification(subject.trim(), body.trim());
      setSuccess(t("notifSuccess", { recipients: result.recipients }));
      setSubject("");
      setBody("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("notificationsTitle")}</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("notificationsBody")}</p>

      <form onSubmit={handleSubmit} className="mt-4 max-w-lg space-y-4">
        {error && <FormError message={error} />}
        {success && (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
            {success}
          </p>
        )}

        <FormField label={t("notifSubjectLabel")} htmlFor="notif-subject">
          <input
            id="notif-subject"
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
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
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("notifBodyPlaceholder")}
            className={`${inputClass} resize-y`}
          />
        </FormField>

        <button type="submit" disabled={sending} className={`${submitClass} w-auto px-6 py-2 text-sm`}>
          {sending ? t("notifSending") : t("notifSend")}
        </button>
      </form>
    </section>
  );
}
