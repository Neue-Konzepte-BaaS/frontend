import { useState } from "react";
import { Link, useRouteLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import type { Route } from "./+types/home";
import type { clientLoader as customerLayoutLoader } from "./layout";
import { listMyRentals, runningRentals, type RentalStatus, type RentalWithPlot } from "~/lib/rentals";
import { getCropName } from "~/lib/fields";
import { careGuideForPlot, listCareGuide, splitInstructionsByWeek } from "~/lib/care";
import { listNotifications, ripeToday } from "~/lib/notifications";
import { listAnnouncements, recentAnnouncementCount } from "~/lib/announcements";
import { toBbox } from "~/lib/geo";
import { FieldMap, type MapShape } from "~/components/map/field-map";
import { PlotCard, formatRentalPeriod } from "~/components/plot-card";
import { AccountTypeNotice } from "~/components/account-type-notice";
import i18n from "~/i18n";

const STATUS_LABEL_KEY = {
  requested: "search:statusRequested",
  approved: "search:booked",
  declined: "search:statusDeclined",
} as const satisfies Record<RentalStatus, string>;

// The tenant's own rental status, which is a good/waiting/bad axis — not the
// planner's occupancy legend, where the same lime/rose pair means "someone
// asked for this plot" and "this plot is taken" and is tied to the map's hues
// (see plot-grid.tsx). Reusing that pair here read backwards: a booked plot
// came out rose, an undecided request lime.
//
// Each state gets its own *shape*, not just its own tint: solid for the
// settled one, a soft fill for the one still waiting, an outline for the one
// that came to nothing. The palette's warm tones sit close together — a
// warm-olive fill and an error fill are only 1.1:1 apart as surfaces, so
// "waiting" and "declined" told apart by tint alone would read as the same
// blob. The transparent border on the filled two keeps all three the same
// height.
//
// Contrast on bg-paper, all past AA for small text: ivory on moss 7.2:1,
// wood on warm-olive/25 5.1:1, wood on paper 6.4:1. The badge this replaces
// had declined at 2.3:1.
const STATUS_BADGE_CLASS: Record<RentalStatus, string> = {
  requested: "border border-transparent bg-warm-olive/25 text-wood",
  approved: "border border-transparent bg-moss text-ivory",
  declined: "border border-error/50 text-wood",
};

export function meta() {
  return [{ title: i18n.t("search:customerMetaTitle") }];
}

/**
 * The tenant's "Home" (issue #19): what is ripe today, the plot(s) they are
 * renting right now with this week's care task, and a pointer to the board.
 * Plot search lives on its own tab (/search) — see issue #27.
 *
 * The rentals call must succeed; the care guide, inbox and board are extras,
 * so a failing one (or a backend that doesn't have it yet) only drops its own
 * block instead of the whole page — same stance as the inbox route.
 */
export async function clientLoader() {
  const [rentals, guides, notifications, announcements] = await Promise.all([
    listMyRentals(),
    listCareGuide().catch(() => []),
    listNotifications().catch(() => []),
    listAnnouncements().catch(() => []),
  ]);
  return { rentals, guides, notifications, announcements };
}

/**
 * One rented plot on a map. Collapsed it is a small, non-interactive overview
 * (the whole thumbnail is one button); a tap opens the full-size map. The map
 * is remounted on toggle (`key`) rather than resized: FieldMap only fits its
 * bounds on mount and when `fitTo` changes, not when its container changes size.
 */
function PlotMap({ rental }: { rental: RentalWithPlot }) {
  const { t } = useTranslation("customer");
  const [expanded, setExpanded] = useState(false);
  const bbox = toBbox(rental.plot.coordinates);
  const shapes: MapShape[] = [
    { id: rental.plot.id, polygon: rental.plot.coordinates, variant: "plot", selected: true },
  ];
  const center = { lat: (bbox.minLat + bbox.maxLat) / 2, lon: (bbox.minLon + bbox.maxLon) / 2 };

  if (expanded) {
    return (
      <div className="mt-4">
        <div className="overflow-hidden rounded-lg border border-beige">
          <FieldMap key="large" center={center} shapes={shapes} drawMode={null} fitTo={bbox} />
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 text-sm font-medium text-moss hover:underline"
        >
          {t("plotMapCollapse")}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      aria-label={t("plotMapExpand")}
      className="mt-4 block w-full cursor-pointer overflow-hidden rounded-lg border border-beige focus:outline-none focus:ring-2 focus:ring-olive"
    >
      <div className="pointer-events-none">
        <FieldMap
          key="small"
          center={center}
          shapes={shapes}
          drawMode={null}
          fitTo={bbox}
          fitPadding={8}
          className="h-28 w-full"
        />
      </div>
    </button>
  );
}

export default function CustomerHome({ loaderData }: Route.ComponentProps) {
  const { rentals, guides, notifications, announcements } = loaderData;
  const account = useRouteLoaderData<typeof customerLayoutLoader>("customer-layout")?.account;
  const { t, i18n: i18nInstance } = useTranslation(["search", "customer", "common"]);
  const dateLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const timeFormatter = new Intl.DateTimeFormat(dateLocale, { hour: "2-digit", minute: "2-digit" });

  const running = runningRentals(rentals);
  const runningIds = new Set(running.map((rental) => rental.id));
  const otherRentals = rentals.filter((rental) => !runningIds.has(rental.id));
  const ripe = ripeToday(notifications);
  const newPosts = recentAnnouncementCount(announcements);
  // Several plots can run at once, so the care task names its plot then.
  const fieldName = running.length === 1 ? careGuideForPlot(guides, running[0].plot.id)?.fieldName : undefined;

  return (
    <main className="mx-auto max-w-5xl p-4">
      <AccountTypeNotice />

      {fieldName && <p className="text-xs font-semibold tracking-wide text-warm-olive uppercase">{fieldName}</p>}
      <h1 className="text-3xl font-bold text-forest">
        {account ? t("customer:dashboardGreeting", { name: account.firstName }) : t("common:navHome")}
      </h1>

      {ripe && (
        <Link
          to="/customer/inbox"
          className="mt-6 block rounded-2xl border border-beige bg-cream p-5 shadow-sm hover:bg-beige/30"
        >
          <p className="text-xs font-semibold tracking-wide text-warm-olive uppercase">{t("customer:ripeTodayLabel")}</p>
          <p className="mt-1 text-lg font-semibold text-forest">
            {ripe.cropName ? t("customer:inboxRipenessSubject", { crop: ripe.cropName }) : ripe.subject}
          </p>
          <p className="mt-2 text-sm text-warm-olive">
            {t("customer:ripeFrom", { sender: ripe.sender, time: timeFormatter.format(new Date(ripe.createdAt)) })}
          </p>
        </Link>
      )}

      <div className={`grid gap-4 ${running.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {running.map((rental) => {
          const guide = careGuideForPlot(guides, rental.plot.id);
          const [task] = guide ? splitInstructionsByWeek(guide.instructions, guide.currentWeek).thisWeek : [];
          return (
            <div key={rental.id} className="mt-4">
              <section className="rounded-2xl border border-beige bg-cream p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-forest">{rental.plot.name}</h2>
                    <p className="mt-1 text-sm text-warm-olive">{getCropName(rental.crop, i18nInstance.language)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-warm-olive/25 px-2.5 py-0.5 text-xs font-medium text-wood">
                    {t("common:plotStatusRented")}
                  </span>
                </div>
                <PlotMap rental={rental} />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-warm-olive">{formatRentalPeriod(rental.startAt, rental.endAt, dateLocale)}</p>
                  <Link
                    to={`/customer/plots/${rental.plot.id}`}
                    className="flex items-center gap-1 text-sm font-medium text-moss hover:underline"
                  >
                    {t("customer:openPlot")}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </section>

              {task && (
                <section className="mt-4 rounded-2xl border border-beige bg-cream p-5 shadow-sm">
                  <h2 className="text-xs font-semibold tracking-wide text-warm-olive uppercase">
                    {running.length > 1
                      ? `${t("customer:careThisWeek")} · ${rental.plot.name}`
                      : t("customer:careThisWeek")}
                  </h2>
                  <p className="mt-2 font-medium text-forest">{task.title}</p>
                  <p className="mt-1 text-sm text-wood">{task.body}</p>
                </section>
              )}
            </div>
          );
        })}
      </div>

      {running.length === 0 && rentals.length === 0 && (
        <p className="mt-6 text-wood">
          {t("search:noRentalsYet")}{" "}
          <Link to="/search" className="font-medium text-moss hover:underline">
            {t("customer:findAPlot")}
          </Link>
        </p>
      )}

      <Link
        to="/customer/board"
        className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-beige bg-cream p-5 shadow-sm hover:bg-beige/30"
      >
        <div>
          <p className="font-semibold text-forest">{t("common:navBoard")}</p>
          <p className="mt-1 text-sm text-warm-olive">
            {newPosts > 0 ? t("customer:boardNewFromFarm", { count: newPosts }) : t("customer:boardNoNewPosts")}
          </p>
        </div>
        {newPosts > 0 && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-deep-olive text-sm font-semibold text-ivory">
            {newPosts}
          </span>
        )}
      </Link>

      {otherRentals.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-forest">{t("search:myRentals")}</h2>
          <ul className="mt-2 divide-y divide-beige">
            {otherRentals.map((rental) => (
              <PlotCard
                key={rental.id}
                name={rental.plot.name}
                meta={`${getCropName(rental.crop, i18nInstance.language)} · ${formatRentalPeriod(rental.startAt, rental.endAt, dateLocale)}`}
                action={
                  /* Only the status here: a rental that isn't running is not
                     one the tenant has a plot page for — a requested or
                     declined one has nothing to show but its dates, and an
                     ended or not-yet-started one has no care week. */
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[rental.status]}`}>
                    {t(STATUS_LABEL_KEY[rental.status])}
                  </span>
                }
              />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
