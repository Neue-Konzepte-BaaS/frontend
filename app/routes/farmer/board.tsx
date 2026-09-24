import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/board";
import { requireRole } from "~/lib/guards";
import { listAnnouncements, type Announcement } from "~/lib/announcements";
import { listFields, type FieldWithPlots } from "~/lib/fields";
import { AnnounceSection } from "~/components/farmer/announce-section";
import { RipenessSection } from "~/components/farmer/ripeness-section";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:boardMetaTitle") }];
}

export async function clientLoader() {
  await requireRole("farmer");
  const [announcements, fields] = await Promise.all([listAnnouncements(), listFields()]);
  return { announcements, fields };
}

/** The field/plot name a scoped announcement was posted to, or `null` for "all tenants". */
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

export default function FarmerBoard({ loaderData }: Route.ComponentProps) {
  const { fields } = loaderData;
  const [announcements, setAnnouncements] = useState<Announcement[]>(loaderData.announcements);
  const { t, i18n: i18nInstance } = useTranslation("farmer");
  const dateLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const dateFormatter = new Intl.DateTimeFormat(dateLocale, { day: "2-digit", month: "short", year: "numeric" });

  return (
    <main className="mx-auto max-w-5xl space-y-10 p-4">
      <h1 className="text-2xl font-bold text-forest">{t("boardTitle")}</h1>

      <AnnounceSection fields={fields} onPosted={(posted) => setAnnouncements((prev) => [posted, ...prev])} />

      <RipenessSection fields={fields} />

      <section>
        <h2 className="text-lg font-semibold text-forest">{t("boardYourPostsTitle")}</h2>
        {announcements.length === 0 ? (
          <p className="mt-3 text-sm text-wood">{t("noPostsYet")}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {announcements.map((announcement) => {
              const scope = scopeLabel(announcement, fields);
              return (
                <li key={announcement.id} className="rounded-xl border border-beige p-4">
                  <div className="flex items-start justify-between gap-3">
                    {scope ? (
                      <span className="inline-flex items-center rounded-full bg-cream px-2.5 py-0.5 text-xs font-medium text-wood">
                        {scope}
                      </span>
                    ) : (
                      <span />
                    )}
                    <time className="text-sm text-warm-olive">
                      {dateFormatter.format(new Date(announcement.createdAt))}
                    </time>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-forest">{announcement.subject}</h3>
                  <p className="mt-1 whitespace-pre-line text-wood">{announcement.body}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
