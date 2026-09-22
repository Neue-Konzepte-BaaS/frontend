import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pin, Wheat } from "lucide-react";
import type { Route } from "./+types/board";
import { listAnnouncements, type Announcement } from "~/lib/announcements";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("search:boardMetaTitle") }];
}

export async function clientLoader() {
  const announcements = await listAnnouncements();
  return { announcements };
}

/**
 * Client-side "pin" (issue #31) — the backend's Announcement has no pinned
 * flag (see backend/openapi.yml), so this is a per-browser bookmark the
 * tenant sets for themselves, not something a farmer can set when posting.
 * If the farmer side ever needs to pin a message for everyone, that needs a
 * backend field on Announcement — flag as a follow-up, not attempted here.
 */
const PINNED_STORAGE_KEY = "baas_pinned_announcements";

function readPinnedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writePinnedIds(ids: Set<string>) {
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignore storage errors (e.g. privacy mode) — pinning just won't persist.
  }
}

export default function CustomerBoard({ loaderData }: Route.ComponentProps) {
  const { announcements } = loaderData;
  const { t, i18n: i18nInstance } = useTranslation(["search", "common"]);
  const dateLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const dateFormatter = new Intl.DateTimeFormat(dateLocale, { day: "2-digit", month: "short", year: "numeric" });

  const [pinnedIds, setPinnedIds] = useState<Set<string>>(readPinnedIds);

  function togglePin(id: string) {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      writePinnedIds(next);
      return next;
    });
  }

  const farmNames = [...new Set(announcements.map((a) => a.farmName))];
  const showFarmChip = farmNames.length > 1;
  const subtitle =
    farmNames.length === 0
      ? t("search:boardEmptySubtitle")
      : farmNames.length === 1
        ? farmNames[0]
        : t("search:boardMultipleFarmsSubtitle", { count: farmNames.length });

  // Array#sort is stable, so within each pinned/unpinned group the API's own
  // newest-first order survives — same approach as farmer/tenants.tsx.
  const sorted = [...announcements].sort((a, b) => {
    const aPinned = pinnedIds.has(a.id);
    const bPinned = pinnedIds.has(b.id);
    return aPinned === bPinned ? 0 : aPinned ? -1 : 1;
  });

  return (
    <main className="mx-auto max-w-3xl p-4">
      {/* No per-farm photo exists yet — same themed-banner stand-in as search/farm.tsx. */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-600 to-emerald-800 dark:from-emerald-800 dark:to-emerald-950">
        <Wheat className="absolute -top-8 -right-8 h-44 w-44 text-white/10" aria-hidden />
        <div className="relative p-6 md:p-10">
          <h1 className="text-3xl font-bold text-white">{t("search:boardTitle")}</h1>
          <p className="mt-2 text-emerald-50">{subtitle}</p>
        </div>
      </div>

      {announcements.length === 0 ? (
        <p className="mt-8 text-gray-600 dark:text-gray-300">{t("search:noAnnouncementsYet")}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {sorted.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              pinned={pinnedIds.has(announcement.id)}
              showFarmChip={showFarmChip}
              dateLabel={dateFormatter.format(new Date(announcement.createdAt))}
              onTogglePin={() => togglePin(announcement.id)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function AnnouncementCard({
  announcement,
  pinned,
  showFarmChip,
  dateLabel,
  onTogglePin,
}: {
  announcement: Announcement;
  pinned: boolean;
  showFarmChip: boolean;
  dateLabel: string;
  onTogglePin: () => void;
}) {
  const { t } = useTranslation("search");

  return (
    <li
      className={`rounded-xl border p-4 ${
        pinned
          ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/40"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {pinned && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              {t("pinnedBadge")}
            </span>
          )}
          {showFarmChip && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {announcement.farmName}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <time className="text-sm text-gray-500 dark:text-gray-400">{dateLabel}</time>
          {/* p-3 + size 20 ≈ 44px hit target — context.md requires large tap targets for elderly tenants. */}
          <button
            type="button"
            onClick={onTogglePin}
            aria-label={t(pinned ? "unpinAnnouncement" : "pinAnnouncement")}
            aria-pressed={pinned}
            className="-m-3 rounded-full p-3 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <Pin size={20} className={pinned ? "fill-emerald-600 text-emerald-600" : undefined} />
          </button>
        </div>
      </div>
      <h2 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{announcement.subject}</h2>
      <p className="mt-1 whitespace-pre-line text-gray-600 dark:text-gray-300">{announcement.body}</p>
    </li>
  );
}
