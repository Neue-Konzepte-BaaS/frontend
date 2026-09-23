import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { MapPin, Wheat } from "lucide-react";
import type { Route } from "./+types/farm";
import { me, dashboardPath } from "~/lib/auth";
import { getFarm } from "~/lib/farms";
import { findNearestPlots, listMyRentals, type NearbyPlot } from "~/lib/rentals";
import { formatArea } from "~/components/plot-card";
import { PlotCropsAndRent } from "~/components/plot-crops-and-rent";
import { FieldMap, type MapShape } from "~/components/map/field-map";
import { toBbox, unionBbox } from "~/lib/geo";
import { submitClass } from "~/components/form";
import { LogoutButton } from "~/components/logout-button";
import { LanguageSwitcher } from "~/components/language-switcher";
import { AppShell } from "~/components/nav/app-shell";
import { useTenantNavItems } from "~/lib/nav-items";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("search:farmMetaTitle") }];
}

/**
 * A farm's public details — reached by clicking a farm in plot search
 * results (see plot-search.tsx). Public, like /search itself: an anonymous
 * visitor or a farmer/admin can browse it, only a customer gets a rent
 * control per plot.
 *
 * There's no "list this farm's plots" endpoint, only GET /api/farms/{id}
 * (name/address/description) and the same nearest-plots search /search
 * itself uses. So this route carries the postalCode/city that produced the
 * click-through (see plot-search.tsx's toFarmLink) and re-runs that search,
 * filtered down to this farm's plots. Landing here without that context
 * (e.g. a bookmarked/shared link) shows the farm's details with no plot
 * list — see hasLocationContext below.
 */
export async function clientLoader({ params, request }: Route.ClientLoaderArgs) {
  const farmId = params.farmId;
  const url = new URL(request.url);
  const postalCode = url.searchParams.get("postalCode");
  const city = url.searchParams.get("city");

  const account = await me();
  const [farm, plots, myRentals] = await Promise.all([
    getFarm(farmId),
    postalCode
      ? findNearestPlots({ postalCode, limit: 30 })
      : city
        ? findNearestPlots({ city, limit: 30 })
        : Promise.resolve<NearbyPlot[]>([]),
    // Only a customer can have rentals; asking as any other role 403s.
    account?.role === "customer" ? listMyRentals() : Promise.resolve([]),
  ]);

  return {
    account,
    farm,
    farmPlots: plots.filter((p) => p.farm === farmId),
    hasLocationContext: Boolean(postalCode || city),
    // Carries the search that led here back into "back to search" below.
    backToSearchQuery: url.searchParams.toString(),
    // A declined rental never occupied the plot, so it doesn't block
    // rebooking; requested and approved both do (the backend enforces this
    // with the same overlap constraint either way).
    rentedPlotIds: myRentals.filter((r) => r.status !== "declined").map((r) => r.plotId),
  };
}

export default function FarmDetail({ loaderData }: Route.ComponentProps) {
  const { account, farm, farmPlots, hasLocationContext, backToSearchQuery, rentedPlotIds } = loaderData;
  const customer = account?.role === "customer" ? account : null;
  const { t, i18n: i18nInstance } = useTranslation(["search", "common"]);
  const numberLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const tenantNavItems = useTenantNavItems();

  // The one plot currently expanded to show its crops and rent control —
  // mirrors plot-search.tsx's own selection state, one at a time.
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  // Seeded from the customer's own rentals, then grown as they rent more
  // plots on this page, so a just-rented plot immediately shows "Rented"
  // instead of the crop picker without a full reload.
  const [rented, setRented] = useState<Set<string>>(() => new Set(rentedPlotIds));

  function toggleSelectPlot(plotId: string) {
    setSelectedPlotId((prev) => (prev === plotId ? null : plotId));
  }

  const backToSearchLink = backToSearchQuery ? `/search?${backToSearchQuery}` : "/search";
  // This page's own URL, query included — so signing in (or a rent's login
  // redirect) returns here with the same search context, not a bare farm page.
  const farmPageUrl = backToSearchQuery ? `/search/farms/${farm.id}?${backToSearchQuery}` : `/search/farms/${farm.id}`;

  // Each plot's real outline, numbered to match the list below, so booking
  // can start by clicking the plot on the map instead of picking from the list.
  const shapes: MapShape[] = farmPlots.map((plot, i) => ({
    id: plot.id,
    polygon: plot.coordinates,
    variant: "plot",
    label: String(i + 1),
    selected: plot.id === selectedPlotId,
  }));
  const fitTo = unionBbox(farmPlots.map((p) => toBbox(p.coordinates)));

  const content = (
    <main className="mx-auto w-full max-w-6xl p-4">
      <Link to={backToSearchLink} className="text-sm text-gray-500 hover:underline dark:text-gray-400">
        &larr; {t("search:backToSearch")}
      </Link>

      {/* No per-farm photo exists yet — a themed banner stands in for one. */}
      <div className="relative mt-4 overflow-hidden rounded-2xl bg-linear-to-br from-emerald-600 to-emerald-800 dark:from-emerald-800 dark:to-emerald-950">
        <Wheat className="absolute -top-8 -right-8 h-44 w-44 text-white/10" aria-hidden />
        <div className="relative p-6 md:p-10">
          <h1 className="text-3xl font-bold text-white">{farm.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-emerald-50">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            {farm.address}
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-gray-200 p-6 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("search:aboutFarm")}</h2>
        {farm.description ? (
          <p className="mt-2 max-w-2xl whitespace-pre-line text-gray-600 dark:text-gray-300">{farm.description}</p>
        ) : (
          <p className="mt-2 text-gray-500 italic dark:text-gray-400">{t("search:noFarmDescriptionYet")}</p>
        )}
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
          {farm.foundedAt && (
            <div>
              <dt className="inline font-medium text-gray-700 dark:text-gray-200">{t("search:foundedLabel")}</dt>{" "}
              <dd className="inline">{new Date(farm.foundedAt).getFullYear()}</dd>
            </div>
          )}
          <div>
            <dt className="inline font-medium text-gray-700 dark:text-gray-200">{t("search:totalAreaLabel")}</dt>{" "}
            <dd className="inline">{formatArea(farm.totalSquareMeters, numberLocale)}</dd>
          </div>
        </dl>
      </section>

      {hasLocationContext && farmPlots.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          <FieldMap
            center={{ lat: farmPlots[0].coordinates.coordinates[0][0][1], lon: farmPlots[0].coordinates.coordinates[0][0][0] }}
            shapes={shapes}
            drawMode={null}
            onShapeClick={toggleSelectPlot}
            fitTo={fitTo}
          />
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold text-gray-900 dark:text-white">{t("search:availablePlots")}</h2>

      {!hasLocationContext ? (
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {t("search:farmNeedsSearchContext")}{" "}
          <Link to={backToSearchLink} className="text-emerald-700 hover:underline dark:text-emerald-400">
            {t("search:backToSearch")}
          </Link>
        </p>
      ) : farmPlots.length === 0 ? (
        <p className="mt-2 text-gray-600 dark:text-gray-300">{t("search:farmHasNoPlotsNearby")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800">
          {farmPlots.map((plot, i) => {
            const isSelected = plot.id === selectedPlotId;
            const isRented = rented.has(plot.id);
            return (
              <li key={plot.id}>
                <button
                  type="button"
                  onClick={() => toggleSelectPlot(plot.id)}
                  aria-expanded={isSelected}
                  disabled={isRented}
                  className="flex w-full items-center gap-3 py-3 text-left disabled:cursor-default"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-gray-900 dark:text-white">{plot.name}</span>
                    <span className="block text-sm text-gray-500">{formatArea(plot.areaSquareMeters, numberLocale)}</span>
                  </span>
                  {isRented ? (
                    <span className="shrink-0 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      {t("search:requestSent")}
                    </span>
                  ) : (
                    <span className="shrink-0 text-gray-400" aria-hidden>
                      {isSelected ? "▾" : "▸"}
                    </span>
                  )}
                </button>

                {isSelected && !isRented && (
                  <div className="pb-3 pl-9">
                    <PlotCropsAndRent
                      plotId={plot.id}
                      crops={plot.crops}
                      account={account}
                      loginRedirectTo={farmPageUrl}
                      onRented={() => setRented((prev) => new Set(prev).add(plot.id))}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800">
        {/* A signed-in customer gets AppShell's full-bleed sidebar layout below,
            so the header must also go edge to edge to line up with it — unlike
            the anonymous case, whose content stays centered at max-w-6xl with
            no sidebar (see search.tsx for the same pattern). */}
        <div className={`flex items-center justify-between p-4 ${customer ? "" : "mx-auto max-w-6xl"}`}>
          <Link to="/" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
            {t("common:brand")}
          </Link>
          {account ? (
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link
                to={dashboardPath(account.role)}
                className="whitespace-nowrap text-sm font-medium text-gray-700 hover:underline dark:text-gray-200"
              >
                {t("common:goToDashboard")}
              </Link>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link
                to={`/login?redirect=${encodeURIComponent(farmPageUrl)}`}
                className="whitespace-nowrap text-sm font-medium text-gray-700 hover:underline dark:text-gray-200"
              >
                {t("common:signIn")}
              </Link>
              <Link
                to={`/register?redirect=${encodeURIComponent(farmPageUrl)}`}
                className={`${submitClass} inline-block w-auto px-4 py-2 text-sm`}
              >
                {t("common:createAccount")}
              </Link>
            </div>
          )}
        </div>
      </header>

      {customer ? <AppShell items={tenantNavItems}>{content}</AppShell> : content}
    </div>
  );
}
