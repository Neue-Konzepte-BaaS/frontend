import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { MapPin, Wheat } from "lucide-react";
import type { Route } from "./+types/farm";
import { me, dashboardPath } from "~/lib/auth";
import { getFarm } from "~/lib/farms";
import { findNearestPlots, listMyRentals, type NearbyPlot } from "~/lib/rentals";
import { formatArea } from "~/components/plot-card";
import { PlotGrid } from "~/components/plot-grid";
import { PlotRentPanel } from "~/components/plot-rent-panel";
import { PlotCropsAndRent } from "~/components/plot-crops-and-rent";
import { sortPlotsNaturally } from "~/lib/plots";
import { FieldMap, type MapShape } from "~/components/map/field-map";
import { toBbox, unionBbox } from "~/lib/geo";
import { FALLBACK_CENTER } from "~/lib/geocode";
import { LogoutButton } from "~/components/logout-button";
import { LanguageSwitcher } from "~/components/language-switcher";
import { AppShell } from "~/components/nav/app-shell";
import { useTenantNavItems } from "~/lib/nav-items";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("search:farmMetaTitle") }];
}

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
    account?.role === "customer" ? listMyRentals() : Promise.resolve([]),
  ]);

  return {
    account,
    farm,
    farmPlots: plots.filter((p) => p.farm === farmId),
    hasLocationContext: Boolean(postalCode || city),
    backToSearchQuery: url.searchParams.toString(),
    rentedPlotIds: myRentals.map((r) => r.plotId),
  };
}

export default function FarmDetail({ loaderData }: Route.ComponentProps) {
  const { account, farm, farmPlots, hasLocationContext, backToSearchQuery, rentedPlotIds } = loaderData;
  const customer = account?.role === "customer" ? account : null;
  const { t, i18n: i18nInstance } = useTranslation(["search", "common", "home"]);
  const numberLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const tenantNavItems = useTenantNavItems();

  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [rented, setRented] = useState<Set<string>>(() => new Set(rentedPlotIds));
  const panelRef = useRef<HTMLDivElement>(null);
  const plots = sortPlotsNaturally(farmPlots);

  function toggleSelectPlot(plotId: string) {
    setSelectedPlotId((prev) => (prev === plotId ? null : plotId));
  }

  // On narrow screens the panel sits below the grid — bring it into view so
  // a click on the map visibly does something.
  useEffect(() => {
    if (selectedPlotId && window.matchMedia("(max-width: 1023px)").matches) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedPlotId]);

  const backToSearchLink = backToSearchQuery ? `/search?${backToSearchQuery}` : "/search";
  const farmPageUrl = backToSearchQuery ? `/search/farms/${farm.id}?${backToSearchQuery}` : `/search/farms/${farm.id}`;

  const shapes: MapShape[] = plots.map((plot, i) => ({
    id: plot.id,
    polygon: plot.coordinates,
    variant: "plot",
    label: String(i + 1),
    selected: plot.id === selectedPlotId,
    requested: rented.has(plot.id),
  }));
  const selectedIndex = plots.findIndex((p) => p.id === selectedPlotId);
  const selected = selectedIndex >= 0 ? { plot: plots[selectedIndex], number: selectedIndex + 1 } : null;
  // Framed tightly on this farm's plots so they're big enough to click —
  // picking a plot on the map is this page's main job.
  const fitTo = unionBbox(farmPlots.map((p) => toBbox(p.coordinates)));
  // Only a first-paint value — fitTo takes over as soon as the map loads.
  const initialCenter = fitTo
    ? { lat: (fitTo.minLat + fitTo.maxLat) / 2, lon: (fitTo.minLon + fitTo.maxLon) / 2 }
    : FALLBACK_CENTER;

  const content = (
    <main className="mx-auto w-full max-w-6xl p-6">
      <Link to={backToSearchLink} className="text-sm text-warm-olive hover:text-wood hover:underline">
        &larr; {t("search:backToSearch")}
      </Link>

      {/* Farm banner */}
      <div className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-moss to-forest">
        <Wheat className="absolute -top-8 -right-8 h-44 w-44 text-white/10" aria-hidden />
        <div className="relative p-6 md:p-10">
          <h1 className="font-serif text-3xl font-bold text-ivory">{farm.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-cream/80">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            {farm.address}
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-beige p-6">
        <h2 className="font-serif text-lg font-semibold text-forest">{t("search:aboutFarm")}</h2>
        {farm.description ? (
          <p className="mt-2 max-w-2xl whitespace-pre-line text-wood">{farm.description}</p>
        ) : (
          <p className="mt-2 italic text-warm-olive">{t("search:noFarmDescriptionYet")}</p>
        )}
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-warm-olive">
          {farm.foundedAt && (
            <div>
              <dt className="inline font-medium text-wood">{t("search:foundedLabel")}</dt>{" "}
              <dd className="inline">{new Date(farm.foundedAt).getFullYear()}</dd>
            </div>
          )}
          <div>
            <dt className="inline font-medium text-wood">{t("search:totalAreaLabel")}</dt>{" "}
            <dd className="inline">{formatArea(farm.totalSquareMeters, numberLocale)}</dd>
          </div>
        </dl>
      </section>

      <h2 className="mt-8 font-serif text-lg font-semibold text-forest">{t("search:availablePlots")}</h2>

      {!hasLocationContext ? (
        <p className="mt-2 text-wood">
          {t("search:farmNeedsSearchContext")}{" "}
          <Link to={backToSearchLink} className="text-moss hover:underline">
            {t("search:backToSearch")}
          </Link>
        </p>
      ) : farmPlots.length === 0 ? (
        <p className="mt-2 text-wood">{t("search:farmHasNoPlotsNearby")}</p>
      ) : (
        <>
        <ul className="mt-2 divide-y divide-beige">
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
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-beige text-xs font-semibold text-wood"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-forest">{plot.name}</span>
                    <span className="block text-sm text-warm-olive">{formatArea(plot.areaSquareMeters, numberLocale)}</span>
                  </span>
                  {isRented ? (
                    <span className="shrink-0 text-sm font-medium text-moss">
                      {t("search:rented")}
                    </span>
                  ) : (
                    <span className="shrink-0 text-warm-olive" aria-hidden>
                      {isSelected ? "▾" : "▸"}
                    </span>
                  )}
                </button>

                {isSelected && !isRented && (
                  <div className="pb-3 pl-9">
                    <PlotCropsAndRent
                      plotId={plot.id}
                      plotName={plot.name}
                      farmName={farm.name}
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
        <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div>
            <div className="overflow-hidden rounded-lg border border-beige">
              <FieldMap
                center={initialCenter}
                shapes={shapes}
                drawMode={null}
                onShapeClick={toggleSelectPlot}
                fitTo={fitTo}
              />
            </div>
            <div className="mt-4">
              <PlotGrid
                plots={plots.map((p) => ({ id: p.id, status: rented.has(p.id) ? "requested" : "free" }))}
                selectedIds={new Set(selectedPlotId ? [selectedPlotId] : [])}
                onSelect={toggleSelectPlot}
                legendStatuses={["free", "requested"]}
              />
            </div>
          </div>
          <div ref={panelRef} className="scroll-mt-4 lg:sticky lg:top-4">
            <PlotRentPanel
              selected={selected}
              alreadyRequested={selected ? rented.has(selected.plot.id) : false}
              farmName={farm.name}
              account={account}
              loginRedirectTo={farmPageUrl}
              onRented={(rental) => setRented((prev) => new Set(prev).add(rental.plotId))}
            />
          </div>
        </div>
        </>
      )}
    </main>
  );

  if (customer) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-beige bg-cream">
          <div className="flex items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-2">
              <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none">
                <circle cx="16" cy="16" r="16" className="fill-deep-olive" />
                <path d="M16 6 C10 10 8 16 10 22 C12 18 14 16 16 15 C18 16 20 18 22 22 C24 16 22 10 16 6Z" className="fill-beige" />
              </svg>
              <div className="leading-tight">
                <span className="block text-sm font-bold uppercase tracking-widest text-forest">BAUER</span>
                <span className="block text-[10px] text-forest/60">as a service</span>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <span className="hidden text-sm font-medium text-wood sm:block">
                {customer.firstName} {customer.lastName}
              </span>
              <LogoutButton />
            </div>
          </div>
        </header>
        <AppShell items={tenantNavItems}>{content}</AppShell>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="bg-cream">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-3">
            <svg viewBox="0 0 32 32" className="h-10 w-10" fill="none">
              <circle cx="16" cy="16" r="16" className="fill-deep-olive" />
              <path d="M16 6 C10 10 8 16 10 22 C12 18 14 16 16 15 C18 16 20 18 22 22 C24 16 22 10 16 6Z" className="fill-beige" />
            </svg>
            <div className="leading-tight">
              <span className="block text-base font-bold uppercase tracking-widest text-forest">BAUER</span>
              <span className="block text-xs text-forest/60">as a service</span>
            </div>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link to="/" className="text-sm text-wood hover:text-forest">{t("home:navHome")}</Link>
            <Link to="/for-farmers" className="text-sm text-wood hover:text-forest">{t("home:navForFarmers")}</Link>
            <Link to="/search" className="text-sm text-wood hover:text-forest">{t("home:navForCustomers")}</Link>
          </nav>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {account ? (
              <Link to={dashboardPath(account.role)} className="rounded-full bg-deep-olive px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-moss">
                {t("common:goToDashboard")}
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-wood hover:text-forest">{t("common:signIn")}</Link>
                <Link to="/register" className="rounded-full bg-deep-olive px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-moss">{t("home:getStarted")}</Link>
              </>
            )}
          </div>
        </div>
      </header>
      {content}
    </div>
  );
}
