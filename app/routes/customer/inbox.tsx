import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/inbox";
import { listNotifications, type Notification, type NotificationKind } from "~/lib/notifications";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("customer:inboxMetaTitle") }];
}

export async function clientLoader() {
  const notifications = await listNotifications().catch(() => []);
  return { notifications };
}

type Filter = "all" | NotificationKind;
type Group = "today" | "thisWeek" | "older";

const FILTERS: Filter[] = ["all", "ripeness", "care", "farm"];

function kindBadgeClass(kind: NotificationKind): string {
  if (kind === "ripeness") return "bg-warm-olive/20 text-warm-olive";
  if (kind === "care") return "bg-moss/15 text-moss";
  return "bg-beige text-wood";
}

function chipClass(active: boolean): string {
  return active ? "bg-deep-olive text-ivory" : "bg-beige/50 text-wood hover:bg-beige";
}

function getGroup(createdAt: string): Group {
  const now = new Date();
  const d = new Date(createdAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  if (d >= startOfToday) return "today";
  if (d >= startOfWeek) return "thisWeek";
  return "older";
}

function groupNotifications(notifications: Notification[]): Record<Group, Notification[]> {
  const groups: Record<Group, Notification[]> = { today: [], thisWeek: [], older: [] };
  for (const n of notifications) groups[getGroup(n.createdAt)].push(n);
  return groups;
}

function timeLabel(createdAt: string, group: Group, locale: string): string {
  const d = new Date(createdAt);
  if (group === "today") return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (group === "thisWeek") return d.toLocaleDateString(locale, { weekday: "short" });
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short" });
}

const FILTER_LABEL: Record<Filter, string> = {
  all:      "inboxFilterAll",
  ripeness: "inboxFilterRipeness",
  care:     "inboxFilterCare",
  farm:     "inboxFilterFarm",
};

const KIND_LABEL: Record<NotificationKind, string> = {
  ripeness: "inboxKindRipeness",
  care:     "inboxKindCare",
  farm:     "inboxKindFarm",
};

const GROUP_ORDER: { key: Group; labelKey: string }[] = [
  { key: "today",    labelKey: "inboxGroupToday" },
  { key: "thisWeek", labelKey: "inboxGroupThisWeek" },
  { key: "older",    labelKey: "inboxGroupOlder" },
];

export default function CustomerInbox({ loaderData }: Route.ComponentProps) {
  const { notifications } = loaderData;
  const { t, i18n: i18nInstance } = useTranslation("customer");
  const locale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.kind === filter);
  const groups = groupNotifications(filtered);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-serif text-3xl font-bold text-forest">{t("inboxHeading")}</h1>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${chipClass(filter === key)}`}
          >
            {t(FILTER_LABEL[key])}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-warm-olive">{t("inboxEmpty")}</p>
      ) : (
        <div className="mt-6 space-y-8">
          {GROUP_ORDER.map(({ key, labelKey }) => {
            const items = groups[key];
            if (items.length === 0) return null;
            return (
              <section key={key}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-warm-olive">
                  {t(labelKey)}
                </h2>
                <ul className="flex flex-col gap-3">
                  {items.map((n) => (
                    <NotificationCard key={n.id} notification={n} timeLabel={timeLabel(n.createdAt, key, locale)} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

function NotificationCard({ notification, timeLabel: time }: { notification: Notification; timeLabel: string }) {
  const { t } = useTranslation("customer");

  const subject = notification.kind === "ripeness" && notification.cropName
    ? t("inboxRipenessSubject", { crop: notification.cropName })
    : notification.subject;
  const body = notification.kind === "ripeness" && notification.cropName && notification.fieldName
    ? t("inboxRipenessBody", { crop: notification.cropName, field: notification.fieldName })
    : notification.body;

  return (
    <li className="rounded-2xl border border-beige bg-cream px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${kindBadgeClass(notification.kind)}`}>
          {t(KIND_LABEL[notification.kind])}
        </span>
        <time className="shrink-0 text-sm text-warm-olive">{time}</time>
      </div>
      <p className="mt-3 text-base font-medium text-forest">{subject}</p>
      <p className="mt-1 text-sm text-wood">{body}</p>
      <p className="mt-1 text-sm text-warm-olive">{notification.sender}</p>
    </li>
  );
}
