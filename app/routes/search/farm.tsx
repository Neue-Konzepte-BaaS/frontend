import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { MapPin, Wheat, ChevronRight } from "lucide-react";
import type { Route } from "./+types/farm";
import { me, dashboardPath } from "~/lib/auth";
import { getFarm, getFarmFields } from "~/lib/farms";
import { findNearestPlots, listMyRentals, groupPlotsByField, MAX_NEAREST_PLOTS, type NearbyPlot } from "~/lib/rentals";
import { formatArea } from "~/components/plot-card";
import { PlotStatusLegend } from "~/components/plot-grid";
import { PlotRentPanel } from "~/components/plot-rent-panel";
import { sortPlotsNaturally, plotStatusesByPlot } from "~/lib/plots";
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
  const [farm, fields, plots, myRentals] = await Promise.all([
    getFarm(farmId),
    getFarmFields(farmId),
    // Scoped to this farm server-side — filtering the overall nearest plots
    // instead would show a farm outside the top N as having none.
    postalCode
      ? findNearestPlots({ postalCode, farm: farmId, limit: MAX_NEAREST_PLOTS })
      : city
        ? findNearestPlots({ city, farm: farmId, limit: MAX_NEAREST_PLOTS })
        : Promise.resolve<NearbyPlot[]>([]),
    account?.role === "customer" ? listMyRentals() : Promise.resolve([]),
  ]);

  return {
    account,
    farm,
    fields,
    farmPlots: plots,
    hasLocationContext: Boolean(postalCode || city),
    backToSearchQuery: url.searchParams.toString(),
    // Passed through raw rather than pre-reduced to a per-plot status here:
    // plotStatusesByPlot (see ~/lib/plots) needs each rental's own endAt to
    // tell an approved-but-expired rental apart from one still running, and
    // to prefer an approved rental over a merely requested one for the same
    // plot -- logic worth sharing with PlotGrid/PlotRentPanel below rather
    // than duplicating a simpler version of it here.
    myRentals,
  };
}

export default function FarmDetail({ loaderData }: Route.ComponentProps) {
  const { account, farm, fields, farmPlots, hasLocationContext, backToSearchQuery, myRentals } = loaderData;
  const customer = account?.role === "customer" ? account : null;
  const { t, i18n: i18nInstance } = useTranslation(["search", "common", "home"]);
  const numberLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const tenantNavItems = useTenantNavItems();

  // Which field's plots are showing — null means the field picker is
  // showing instead. Reflected in the URL (not just component state) so a
  // direct link, a refresh, or the browser's back button all land on the
  // same step, the same way the postalCode/city search params already
  // survive navigation.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedFieldId = searchParams.get("field");
  function selectField(fieldId: string | null) {
    const next = new URLSearchParams(searchParams);
    if (fieldId) {
      next.set("field", fieldId);
    } else {
      next.delete("field");
    }
    setSearchParams(next);
  }

  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const plots = sortPlotsNaturally(farmPlots);
  // A declined rental frees its plot up again (the backend's own exclusion
  // constraint agrees: it's partial, `WHERE status <> 'declined'`), which
  // plotStatusesByPlot already accounts for -- it only ever returns
  // "requested" or "rented" from a still-live approved/requested rental.
  const plotStatusByPlot = plotStatusesByPlot(plots.map((p) => p.id), myRentals);
  const plotsByField = groupPlotsByField(plots);

  const selectedField = selectedFieldId ? (fields.find((f) => f.id === selectedFieldId) ?? null) : null;
  // A field link from a stale/foreign context that doesn't match any of this
  // farm's fields falls back to the picker rather than an empty plot list
  // with no way back.
  const fieldPlots = selectedField ? (plotsByField.get(selectedField.id) ?? []) : [];

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

  // Clear the plot selection whenever the field changes (including leaving
  // it) — a plot selected in one field has no meaning once a different
  // field's list is showing.
  useEffect(() => {
    setSelectedPlotId(null);
  }, [selectedFieldId]);

  const backToSearchLink = backToSearchQuery ? `/search?${backToSearchQuery}` : "/search";
  const farmPageUrl = backToSearchQuery ? `/search/farms/${farm.id}?${backToSearchQuery}` : `/search/farms/${farm.id}`;
  function fieldPageUrl(fieldId: string) {
    const query = new URLSearchParams(backToSearchQuery);
    query.set("field", fieldId);
    return `/search/farms/${farm.id}?${query.toString()}`;
  }

  const shapes: MapShape[] = selectedField
    ? fieldPlots.map((plot) => ({
        id: plot.id,
        polygon: plot.coordinates,
        variant: "plot",
        label: plot.name,
        selected: plot.id === selectedPlotId,
        requested: plotStatusByPlot.get(plot.id)?.status === "requested",
        rented: plotStatusByPlot.get(plot.id)?.status === "rented",
      }))
    : // Colored as "plot" (not "field") so the field picker matches the color
      // a visitor sees once they're inside a field looking at its plots,
      // and the same color already used for fields on the /search page.
      fields.map((field) => ({ id: field.id, polygon: field.coordinates, variant: "plot" }));

  const selectedPlot = fieldPlots.find((p) => p.id === selectedPlotId) ?? null;

  // Framed tightly on whatever's currently selectable — every field while
  // picking one, just the selected field's plots once inside it — so a farm
  // spanning several distant fields doesn't zoom out so far that the shapes
  // worth clicking become specks.
  const fitTo = selectedField
    ? unionBbox(fieldPlots.map((p) => toBbox(p.coordinates)))
    : unionBbox(fields.map((f) => toBbox(f.coordinates)));
  // Only a first-paint value — fitTo takes over as soon as the map loads.
  const initialCenter = fitTo
    ? { lat: (fitTo.minLat + fitTo.maxLat) / 2, lon: (fitTo.minLon + fitTo.maxLon) / 2 }
    : FALLBACK_CENTER;

  function handleMapShapeClick(id: string) {
    if (selectedField) {
      toggleSelectPlot(id);
    } else {
      selectField(id);
    }
  }

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

      {!hasLocationContext ? (
        <>
          <h2 className="mt-8 font-serif text-lg font-semibold text-forest">{t("search:availableFields")}</h2>
          <p className="mt-2 text-wood">
            {t("search:farmNeedsSearchContext")}{" "}
            <Link to={backToSearchLink} className="text-moss hover:underline">
              {t("search:backToSearch")}
            </Link>
          </p>
        </>
      ) : fields.length === 0 ? (
        <>
          <h2 className="mt-8 font-serif text-lg font-semibold text-forest">{t("search:availableFields")}</h2>
          <p className="mt-2 text-wood">{t("search:farmHasNoPlotsNearby")}</p>
        </>
      ) : !selectedField ? (
        <>
          <h2 className="mt-8 font-serif text-lg font-semibold text-forest">{t("search:availableFields")}</h2>
          <div className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div className="overflow-hidden rounded-lg border border-beige lg:sticky lg:top-4">
              <FieldMap center={initialCenter} shapes={shapes} drawMode={null} onShapeClick={handleMapShapeClick} fitTo={fitTo} />
            </div>
            <div>
              <p className="text-sm text-warm-olive">{t("search:chooseFieldHint")}</p>
              <ul className="mt-2 divide-y divide-beige">
                {fields.map((field) => (
                  <li key={field.id}>
                    <Link
                      to={fieldPageUrl(field.id)}
                      className="flex items-center justify-between gap-3 py-4 hover:bg-cream"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-forest">{field.name}</span>
                        <span className="block text-sm text-warm-olive">
                          {field.plotCount > 0
                            ? `${t("search:fieldPlotCount", { count: field.plotCount })} · ${formatArea(field.areaSquareMeters, numberLocale)}`
                            : t("search:fieldFullyBooked")}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-warm-olive" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-8 flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-semibold text-forest">{selectedField.name}</h2>
            <button type="button" onClick={() => selectField(null)} className="text-sm text-warm-olive hover:text-wood hover:underline">
              &larr; {t("search:backToFields")}
            </button>
          </div>

          {fieldPlots.length === 0 ? (
            <p className="mt-2 text-wood">{t("search:fieldHasNoPlotsNearby")}</p>
          ) : (
            <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
              <div>
                <div className="overflow-hidden rounded-lg border border-beige">
                  <FieldMap center={initialCenter} shapes={shapes} drawMode={null} onShapeClick={handleMapShapeClick} fitTo={fitTo} />
                </div>
                <PlotStatusLegend
                  plots={fieldPlots.map((p) => ({ status: plotStatusByPlot.get(p.id)?.status ?? "free" }))}
                  legendStatuses={["free", "requested", "rented"]}
                />
              </div>
              <div ref={panelRef} className="scroll-mt-4 lg:sticky lg:top-4">
                <PlotRentPanel
                  selected={selectedPlot}
                  alreadyRequested={selectedPlot ? plotStatusByPlot.get(selectedPlot.id)?.status !== "free" : false}
                  account={account}
                  loginRedirectTo={farmPageUrl}
                  returnTo={farmPageUrl}
                />
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );

  if (customer) {
    return (
      <div className="flex h-screen flex-col">
        <header className="border-b border-beige bg-cream">
          <div className="flex items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/farmlandlogo.png" alt="Farmland" className="h-10 w-10 rounded-full" />
              <span className="-translate-y-1 text-2xl font-bold text-forest" style={{fontFamily: "'Playfair Display', serif"}}>Farmland</span>
            </Link>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <span className="hidden text-base font-semibold text-forest sm:block">
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
            <img src="/farmlandlogo.png" alt="Farmland" className="h-10 w-10 rounded-full" />
            <span className="-translate-y-1 text-2xl font-bold text-forest" style={{fontFamily: "'Playfair Display', serif"}}>Farmland</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {account ? (
              <Link to={dashboardPath(account.role)} className="rounded-full bg-deep-olive px-6 py-2.5 text-sm font-semibold text-ivory hover:bg-moss">
                {t("common:goToDashboard")}
              </Link>
            ) : (
              <>
                <Link to="/login" className="min-w-[80px] text-center text-base font-semibold text-forest hover:text-moss">{t("common:signIn")}</Link>
                <Link to="/register" className="min-w-[130px] rounded-full bg-deep-olive px-6 py-2.5 text-center text-sm font-semibold text-ivory hover:bg-moss">{t("home:getStarted")}</Link>
              </>
            )}
          </div>
        </div>
      </header>
      {content}
    </div>
  );
}
