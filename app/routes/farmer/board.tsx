import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/board";
import { requireRole } from "~/lib/guards";
import { listAnnouncements, createAnnouncement, type Announcement } from "~/lib/announcements";
import { listFields, type FieldWithPlots } from "~/lib/fields";
import { listFarmRentals, activeRentalsByPlot, type FarmRental } from "~/lib/rentals";
import { RipenessSection } from "~/components/farmer/ripeness-section";
import { ApiError } from "~/lib/api-client";
import { Field as FormField, FormError, FormSuccess, inputClass, submitClass } from "~/components/form";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:boardMetaTitle") }];
}

export async function clientLoader() {
  await requireRole("farmer");
  const [announcements, fields, rentals] = await Promise.all([listAnnouncements(), listFields(), listFarmRentals()]);
  return { announcements, fields, activeByPlot: activeRentalsByPlot(rentals) };
}

function scopeLabel(announcement: Announcement, fields: FieldWithPlots[]): string | null {
  if (announcement.fieldId) {
    return fields.find((f) => f.id === announcement.fieldId)?.name ?? null;
  }
  if (announcement.plotId) {
    for (const field of fields) {
      const plot = field.plots.find((p) => p.id === announcement.plotId);
      if (plot) return `${field.name} – ${plot.name}`;
    }
  }
  return null;
}

type Tab = "send" | "history";
type Filter = "all" | "public" | "field" | "private";
type Destination = "board" | "inbox";

function ComposeBox({
  fields,
  activeByPlot,
  onPosted,
}: {
  fields: FieldWithPlots[];
  activeByPlot: Map<string, FarmRental>;
  onPosted: (announcement: Announcement) => void;
}) {
  const { t } = useTranslation("farmer");

  const rentedPlots = fields.flatMap((field) =>
    field.plots
      .filter((plot) => activeByPlot.has(plot.id))
      .map((plot) => {
        const rental = activeByPlot.get(plot.id)!;
        return {
          id: plot.id,
          label: `${field.name} – ${plot.name} (${rental.customer.firstName} ${rental.customer.lastName})`,
        };
      })
  );

  const [destination, setDestination] = useState<Destination>("board");
  const [fieldId, setFieldId] = useState(fields[0]?.id ?? "");
  const [plotId, setPlotId] = useState(rentedPlots[0]?.id ?? "");
  const [boardScope, setBoardScope] = useState<"all" | "field">("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSending(true);
    try {
      const result = await createAnnouncement({
        subject: subject.trim(),
        body: body.trim(),
        fieldId: destination === "board" && boardScope === "field" ? fieldId : undefined,
        plotId: destination === "inbox" ? plotId : undefined,
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

  const textIncomplete = subject.trim() === "" || body.trim() === "";
  const incomplete = textIncomplete || (destination === "inbox" && !plotId);

  const destClass = (active: boolean) =>
    `flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
      active ? "bg-deep-olive text-ivory" : "bg-beige/50 text-wood hover:bg-beige"
    }`;

  return (
    <div className="rounded-xl border border-beige bg-paper-contrast p-5">
      <h2 className="text-lg font-semibold text-forest">{t("composeSectionTitle")}</h2>
      <p className="mt-1 text-sm text-warm-olive">{t("composeSectionBody")}</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {error && <FormError message={error} />}
        {success && <FormSuccess message={success} />}

        {/* Destination toggle */}
        <div className="flex gap-2">
          <button type="button" className={destClass(destination === "board")} onClick={() => setDestination("board")}>
            {t("composeDestBoard")}
          </button>
          <button type="button" className={destClass(destination === "inbox")} onClick={() => setDestination("inbox")}>
            {t("composeDestInbox")}
          </button>
        </div>

        {/* Board: scope selector */}
        {destination === "board" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBoardScope("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                boardScope === "all" ? "bg-forest text-ivory" : "bg-beige text-wood hover:bg-beige/80"
              }`}
            >
              {t("announceScopeAll")}
            </button>
            {fields.length > 0 && (
              <button
                type="button"
                onClick={() => setBoardScope("field")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  boardScope === "field" ? "bg-forest text-ivory" : "bg-beige text-wood hover:bg-beige/80"
                }`}
              >
                {t("announceScopeField")}
              </button>
            )}
            {boardScope === "field" && (
              <select
                aria-label={t("announceChooseField")}
                value={fieldId}
                onChange={(e) => setFieldId(e.target.value)}
                disabled={sending}
                className={`${inputClass} w-auto py-1 text-xs bg-paper`}
              >
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Inbox: plot selector */}
        {destination === "inbox" && (
          rentedPlots.length > 0 ? (
            <select
              aria-label={t("announceChoosePlot")}
              value={plotId}
              onChange={(e) => setPlotId(e.target.value)}
              disabled={sending}
              className={`${inputClass} w-full py-2 bg-paper`}
            >
              {rentedPlots.map((plot) => (
                <option key={plot.id} value={plot.id}>{plot.label}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-warm-olive">{t("freePlotHint")}</p>
          )
        )}

        <FormField label={t("announceSubjectLabel")} htmlFor="compose-subject">
          <input
            id="compose-subject"
            type="text"
            required
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("announceSubjectPlaceholder")}
            className={`${inputClass} bg-paper`}
          />
        </FormField>

        <FormField label={t("announceBodyLabel")} htmlFor="compose-body">
          <textarea
            id="compose-body"
            required
            rows={4}
            maxLength={10000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("announceBodyPlaceholder")}
            className={`${inputClass} resize-y bg-paper`}
          />
        </FormField>

        <button
          type="submit"
          disabled={sending || incomplete}
          className={`${submitClass} w-auto px-6 py-2 text-sm`}
        >
          {sending ? t("announceSending") : t("announceSend")}
        </button>
      </form>
    </div>
  );
}

export default function FarmerBoard({ loaderData }: Route.ComponentProps) {
  const { fields, activeByPlot } = loaderData;
  const [announcements, setAnnouncements] = useState<Announcement[]>(loaderData.announcements);
  const { t, i18n: i18nInstance } = useTranslation("farmer");
  const dateLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const dateFormatter = new Intl.DateTimeFormat(dateLocale, { day: "2-digit", month: "short", year: "numeric" });

  const [tab, setTab] = useState<Tab>("send");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = announcements.filter((a) => {
    if (filter === "public") return !a.fieldId && !a.plotId;
    if (filter === "field") return !!a.fieldId;
    if (filter === "private") return !!a.plotId;
    return true;
  });

  const chipClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-deep-olive text-ivory" : "bg-beige/50 text-wood hover:bg-beige"
    }`;

  const tabClass = (active: boolean) =>
    `px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
      active ? "border-forest text-forest" : "border-transparent text-warm-olive hover:text-forest"
    }`;

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold text-forest">{t("boardTitle")}</h1>

      {/* Tabs */}
      <div className="mt-4 flex border-b border-beige">
        <button type="button" className={tabClass(tab === "send")} onClick={() => setTab("send")}>
          {t("boardTabSend")}
        </button>
        <button type="button" className={tabClass(tab === "history")} onClick={() => setTab("history")}>
          {t("boardTabHistory")}
        </button>
      </div>

      {tab === "send" && (
        <div className="mt-6 space-y-8">
          <ComposeBox
            fields={fields}
            activeByPlot={activeByPlot}
            onPosted={(posted) => setAnnouncements((prev) => [posted, ...prev])}
          />
          <RipenessSection fields={fields} />
        </div>
      )}

      {tab === "history" && (
        <div className="mt-6">
          <div className="flex gap-2">
            {(["all", "public", "field", "private"] as Filter[]).map((f) => (
              <button key={f} type="button" className={chipClass(filter === f)} onClick={() => setFilter(f)}>
                {t(f === "all" ? "boardFilterAll" : f === "public" ? "boardFilterPublic" : f === "field" ? "boardFilterField" : "boardFilterPrivate")}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="mt-6 text-sm text-wood">
              {announcements.length === 0 ? t("noPostsYet") : t("noPostsYetFiltered")}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {filtered.map((announcement) => {
                const scope = scopeLabel(announcement, fields);
                const tenant = announcement.plotId
                  ? activeByPlot.get(announcement.plotId)?.customer ?? null
                  : null;
                const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : null;
                return (
                  <li key={announcement.id} className="rounded-xl border border-beige bg-paper-contrast p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {scope && (
                          <span className="inline-flex items-center rounded-full bg-beige/50 px-2.5 py-0.5 text-xs font-medium text-wood">
                            {scope}
                          </span>
                        )}
                        {tenantName && (
                          <span className="inline-flex items-center rounded-full bg-cream px-2.5 py-0.5 text-xs font-medium text-wood">
                            {tenantName}
                          </span>
                        )}
                        {!tenantName && !scope && (
                          <span className="inline-flex items-center rounded-full bg-beige/50 px-2.5 py-0.5 text-xs font-medium text-wood">
                            {t("boardFilterPublic")}
                          </span>
                        )}
                      </div>
                      <time className="shrink-0 text-sm text-warm-olive">
                        {dateFormatter.format(new Date(announcement.createdAt))}
                      </time>
                    </div>
                    <h3 className="mt-2 text-base font-bold text-forest">{announcement.subject}</h3>
                    <p className="mt-1 whitespace-pre-line text-sm text-wood">{announcement.body}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
