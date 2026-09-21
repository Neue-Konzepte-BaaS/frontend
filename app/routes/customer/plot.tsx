import { Link, redirect, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { Route } from "./+types/plot";
import { listMyRentals, type RentalWithPlot } from "~/lib/rentals";
import {
  careGuideForPlot,
  cropStage,
  isoWeek,
  listCareGuide,
  splitInstructionsByWeek,
  type CareInstruction,
  type CropStage,
  type PlotCareGuide,
} from "~/lib/care";
import { formatArea, formatRentalPeriod } from "~/components/plot-card";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("customer:plotMetaTitle") }];
}

const TABS = ["care", "crops", "rental"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return value !== null && (TABS as readonly string[]).includes(value);
}

/**
 * One rented plot, reached from the tenant's Home list (issue #33).
 *
 * Two calls, no per-plot endpoint: `GET /api/rentals` already returns every
 * rental with its plot and crop, and `GET /api/care-guide` every *running*
 * rental's care guide, so the plot is found in what the tenant already has
 * rather than fetched by id. The same reasoning as farmer/field-detail.tsx —
 * these lists are small, and a backend endpoint per screen is not worth it.
 *
 * The two are not the same set. A rental that has ended is still in
 * `listMyRentals()` (the tenant can look back at it) but never in the care
 * guide, so `guide` is legitimately undefined and the page says so instead of
 * rendering an empty week.
 */
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [rentals, guides] = await Promise.all([listMyRentals(), listCareGuide()]);

  // Newest first, so the first match is this plot's current or most recent
  // rental — a plot the tenant rented twice must not show the older one.
  const rental = rentals.find((r) => r.plot.id === params.plotId);
  if (!rental) {
    throw redirect("/customer");
  }

  return { rental, guide: careGuideForPlot(guides, params.plotId) };
}

export default function CustomerPlot({ loaderData }: Route.ComponentProps) {
  const { rental, guide } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n: i18nInstance } = useTranslation(["customer", "common"]);
  const locale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";

  // The tab lives in the URL, like the admin listings' filters: a tenant can
  // bookmark the care tab, and Back steps out of it rather than off the page.
  const tabParam = searchParams.get("tab");
  const activeTab: Tab = isTab(tabParam) ? tabParam : "care";

  function selectTab(tab: Tab) {
    setSearchParams(tab === "care" ? {} : { tab }, { preventScrollReset: true });
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      <Link to="/customer" className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400">
        ← {t("customer:backToHome")}
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{rental.plot.name}</h1>
      {/* The field name only exists on an active guide — GET /api/rentals does
          not carry it — so the subtitle drops it rather than substituting
          something else for a rental that has ended. */}
      <p className="mt-1 text-gray-600 dark:text-gray-300">
        {[guide?.fieldName, rental.crop.name, formatArea(rental.plot.areaSquareMeters, locale)]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <div role="tablist" aria-label={t("customer:plotTabsLabel")} className="mt-6 flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`plot-tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls={`plot-panel-${tab}`}
            onClick={() => selectTab(tab)}
            className={
              "-mb-px border-b-2 px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 " +
              (activeTab === tab
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white")
            }
          >
            {t(`customer:plotTab_${tab}`)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`plot-panel-${activeTab}`} aria-labelledby={`plot-tab-${activeTab}`} className="mt-6">
        {activeTab === "care" && <CareTab guide={guide} t={t} />}
        {activeTab === "crops" && <CropsTab rental={rental} guide={guide} t={t} locale={locale} />}
        {activeTab === "rental" && <RentalTab rental={rental} guide={guide} t={t} locale={locale} />}
      </div>
    </main>
  );
}

/** Shared muted note, for the two places where the backend has nothing to show. */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
      {children}
    </p>
  );
}

function InstructionList({ instructions, weekLabel }: { instructions: CareInstruction[]; weekLabel: (week: number) => string }) {
  return (
    <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
      {instructions.map((instruction) => (
        <li key={instruction.id} className="px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
            {weekLabel(instruction.week)}
          </p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-white">{instruction.title}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{instruction.body}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * This week's tasks and the ones still ahead. Weeks already past are not
 * shown — the issue asks for the current week and what is coming, and a
 * backlog of things it is too late to do helps nobody.
 */
function CareTab({ guide, t }: { guide: PlotCareGuide | undefined; t: TFunction }) {
  if (!guide) {
    return <Note>{t("customer:careNoActiveRental")}</Note>;
  }

  const { thisWeek, upcoming } = splitInstructionsByWeek(guide.instructions, guide.currentWeek);
  const weekLabel = (week: number) => t("customer:careWeek", { week });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
          {t("customer:careWeekOfTotal", { week: guide.currentWeek, total: guide.totalWeeks })}
        </p>
        {/* Progress through the rental, not through the plant: nothing in the
            API observes the crop itself — see cropStage in ~/lib/care.ts. */}
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-emerald-600"
            style={{ width: `${Math.min(100, Math.round((guide.currentWeek / guide.totalWeeks) * 100))}%` }}
          />
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("customer:careThisWeek")}</h2>
        {thisWeek.length === 0 ? (
          <Note>{t("customer:careNothingThisWeek")}</Note>
        ) : (
          <InstructionList instructions={thisWeek} weekLabel={weekLabel} />
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("customer:careUpcoming")}</h2>
        {upcoming.length === 0 ? (
          <Note>{t("customer:careNothingUpcoming")}</Note>
        ) : (
          <InstructionList instructions={upcoming} weekLabel={weekLabel} />
        )}
      </section>
    </div>
  );
}

const stageClass: Record<CropStage, string> = {
  upcoming: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  growing: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  readyToHarvest: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  seasonOver: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
};

/**
 * What is growing on this plot: the crop the rental books, how far its period
 * has run, and when it is due. "State" is derived from the rental period —
 * the backend records no growth state and no farmer ripeness signal yet
 * (backend#33), so the labels say what the rental says, not what the plot
 * looks like.
 */
function CropsTab({
  rental,
  guide,
  t,
  locale,
}: {
  rental: RentalWithPlot;
  guide: PlotCareGuide | undefined;
  t: TFunction;
  locale: string;
}) {
  const stage = cropStage(rental.startAt, rental.endAt);
  const harvest = new Date(rental.endAt);
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 px-4 py-4 dark:border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{rental.crop.name}</p>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${stageClass[stage]}`}>
            {t(`customer:cropStage_${stage}`)}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">{t("customer:cropHarvestWeek")}</dt>
            <dd className="mt-1 font-medium text-gray-900 dark:text-white">
              {t("customer:calendarWeek", { week: isoWeek(harvest) })} · {dateFormatter.format(harvest)}
            </dd>
          </div>
          {guide && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">{t("customer:cropProgress")}</dt>
              <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                {t("customer:careWeekOfTotal", { week: guide.currentWeek, total: guide.totalWeeks })}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <Note>{t("customer:cropStateNote")}</Note>
    </div>
  );
}

/** The rental period, and where the handover document would go once one exists. */
function RentalTab({
  rental,
  guide,
  t,
  locale,
}: {
  rental: RentalWithPlot;
  guide: PlotCareGuide | undefined;
  t: TFunction;
  locale: string;
}) {
  return (
    <div className="space-y-4">
      <dl className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
        <div className="flex items-baseline justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-gray-500 dark:text-gray-400">{t("customer:rentalPeriod")}</dt>
          <dd className="text-right font-medium text-gray-900 dark:text-white">
            {formatRentalPeriod(rental.startAt, rental.endAt, locale)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-gray-500 dark:text-gray-400">{t("customer:rentalStatus")}</dt>
          <dd className="text-right font-medium text-gray-900 dark:text-white">
            {guide ? t("customer:rentalActive") : t("customer:rentalInactive")}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-gray-500 dark:text-gray-400">{t("customer:rentalPlotSize")}</dt>
          <dd className="text-right font-medium text-gray-900 dark:text-white">
            {formatArea(rental.plot.areaSquareMeters, locale)}
          </dd>
        </div>
        {guide && (
          <div className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-gray-500 dark:text-gray-400">{t("customer:rentalField")}</dt>
            <dd className="text-right font-medium text-gray-900 dark:text-white">{guide.fieldName}</dd>
          </div>
        )}
      </dl>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("customer:handoverHeading")}</h2>
        {/* Deliberately not faked: nothing in the API stores or serves a
            handover document, so there is no link to give. Same rule as the
            ComingSoon stubs — say it is missing rather than render a dead
            button. Needs a backend follow-up. */}
        <Note>{t("customer:handoverUnavailable")}</Note>
      </section>
    </div>
  );
}
