import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { findNearestPlots, groupPlotsByFarm, MAX_NEAREST_PLOTS, type NearbyFarm, type NearbyPlot } from "~/lib/rentals";
import { getFarm } from "~/lib/farms";
import { ApiError } from "~/lib/api-client";
import { FieldMap, type MapShape } from "~/components/map/field-map";
import { toBbox, unionBbox, pointBbox } from "~/lib/geo";
import { geocodeLocation, geocodePostalCode, FALLBACK_CENTER, type LatLon } from "~/lib/geocode";
import { formatDistance } from "~/components/plot-card";
import { Field as FormField, FormError, inputClass, submitClass } from "~/components/form";

/**
 * The plot search: a postal-code/city box over `GET /api/plots/nearest`,
 * shown on a map (each plot numbered) with the farms behind those plots
 * listed below, nearest first. This is a farm directory, not a plot
 * browser — what a farm offers and the rent flow live on its own page
 * (search/farm.tsx, reached by clicking a farm here). The same postalCode/
 * city query is carried along in that link (see toFarmLink below), since
 * that page re-runs this same search scoped to one farm (`farm` param).
 */

type FarmResult = NearbyFarm & { name: string };

/** How many of the nearest results the map viewport is fitted to — see `fitTo` below. */
const MAP_FIT_RESULT_COUNT = 5;

/** The farm detail page's URL, carrying the search that led here — see search/farm.tsx's clientLoader. */
function toFarmLink(farmId: string, locationQuery: URLSearchParams) {
  return `/search/farms/${farmId}?${locationQuery.toString()}`;
}

type PlotSearchProps = {
  /** The signed-in customer's postal code, if any — used to centre the map
   * and auto-run a search on first load so the map isn't empty before the
   * visitor has typed anything. */
  homePostalCode?: number;
};

export function PlotSearch({ homePostalCode }: PlotSearchProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("postalCode") ?? searchParams.get("city") ?? "");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<NearbyPlot[]>([]);
  const [farms, setFarms] = useState<FarmResult[]>([]);
  // The query that produced the current results, reused to link into each
  // farm's own page (see toFarmLink) — that page re-runs this same search.
  const [locationQuery, setLocationQuery] = useState<URLSearchParams>(new URLSearchParams());
  // The geocoded search location, used to make sure the map always moves
  // toward where the visitor searched, not just toward the result plots.
  const [searchCenter, setSearchCenter] = useState<LatLon | null>(null);
  const [showMap, setShowMap] = useState(true);
  const { t, i18n } = useTranslation(["search", "common"]);
  const numberLocale = i18n.language.startsWith("de") ? "de-DE" : "en-GB";

  async function runSearch(trimmed: string) {
    setSearchError(null);
    setSearching(true);
    try {
      // German postal codes are 4–5 digits; anything else is treated as a city.
      const isPostalCode = /^\d{4,5}$/.test(trimmed);
      const locationForGeocode = isPostalCode ? { postalCode: trimmed } : { city: trimmed };
      const [plots, geocoded] = await Promise.all([
        // As many as the API allows: the list is per farm, and one big farm's
        // plots alone would otherwise fill a small limit and hide the rest.
        findNearestPlots({ ...locationForGeocode, limit: MAX_NEAREST_PLOTS }),
        geocodeLocation(locationForGeocode),
      ]);
      const farmSummaries = groupPlotsByFarm(plots);
      // The nearest-plots endpoint only carries each plot's farm id, not its
      // name — one lookup per distinct nearby farm to fill that in.
      const farmDetails = await Promise.all(farmSummaries.map((f) => getFarm(f.farmId)));

      const newLocationQuery = new URLSearchParams(isPostalCode ? { postalCode: trimmed } : { city: trimmed });
      setResults(plots);
      setFarms(farmSummaries.map((f, i) => ({ ...f, name: farmDetails[i].name })));
      setLocationQuery(newLocationQuery);
      setSearchCenter(geocoded);
      setHasSearched(true);
      // Reflected in the URL so a search survives navigating away and back
      // (e.g. into a farm's page and back — see search/farm.tsx's "back to
      // search" link) instead of forcing the visitor to search again.
      setSearchParams(newLocationQuery, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSearchError(t("search:postalCodeOrCityNotFound"));
      } else {
        setSearchError(err instanceof ApiError ? err.message : t("common:genericError"));
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchError(t("search:enterPostalCodeOrCity"));
      return;
    }
    await runSearch(trimmed);
  }

  // Re-run automatically if the page was reached with a query already in the
  // URL (a fresh /search?postalCode=... link, or landing back here from a
  // farm's page) instead of showing a blank search box the visitor already
  // filled in. Otherwise, if the visitor is a signed-in customer, search
  // their home postal code so the map isn't empty before they've typed
  // anything — but leave the search box itself blank, since they didn't
  // actually type this.
  useEffect(() => {
    if (query) runSearch(query);
    else if (homePostalCode) runSearch(String(homePostalCode));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only, using the URL's/account's initial value.
  }, []);

  // Before any search has resolved, still give the map somewhere sensible to
  // sit — the visitor's own postal code if we know it (geocoded once below,
  // cached, and then reused — see geocode.ts — so this doesn't double the
  // Nominatim traffic the auto-search above already causes), else the fallback.
  const [initialCenter, setInitialCenter] = useState<LatLon>(FALLBACK_CENTER);
  useEffect(() => {
    if (!homePostalCode) return;
    geocodePostalCode(homePostalCode).then(setInitialCenter);
  }, [homePostalCode]);

  // Every plot's real outline, same as before the farm-grouped list —
  // labelled with its farm's position in the list below (so a farm with
  // several plots shows the same number on each one) rather than the
  // plot's own index, since the list no longer has a row per plot.
  const shapes: MapShape[] = results.map((plot) => {
    const farmIndex = farms.findIndex((f) => f.farmId === plot.farm);
    return { id: plot.id, polygon: plot.coordinates, variant: "plot", label: farmIndex >= 0 ? String(farmIndex + 1) : "" };
  });
  // Frame the nearest few plots rather than all 30. Results are
  // nearest-first, and the tail can sit tens of kilometres out — fitting to
  // every one of them zooms so far out that the plots the searcher actually
  // cares about become specks. The closest handful keeps the view tight.
  // The geocoded search point is unioned in too, so the map always visibly
  // moves toward where the visitor searched, not just toward the results.
  const resultBoxes = results.slice(0, MAP_FIT_RESULT_COUNT).map((p) => toBbox(p.coordinates));
  const fitTo = unionBbox(searchCenter ? [pointBbox(searchCenter.lon, searchCenter.lat), ...resultBoxes] : resultBoxes);

  function handleShapeClick(plotId: string) {
    const plot = results.find((p) => p.id === plotId);
    if (plot) navigate(toFarmLink(plot.farm, locationQuery));
  }

  return (
    <>
      <form onSubmit={handleSearch} className="mt-4 flex max-w-md gap-3" noValidate>
        <div className="flex-1">
          <FormField label={t("search:postalCodeOrCity")} htmlFor="search">
            <input
              id="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search:postalCodeOrCityPlaceholder")}
              className={inputClass}
            />
          </FormField>
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={searching} className={`${submitClass} w-auto px-6`}>
            {searching ? t("search:searching") : t("search:searchButton")}
          </button>
        </div>
      </form>

      {searchError && (
        <div className="mt-3 max-w-md">
          <FormError message={searchError} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowMap((v) => !v)}
        className="mt-4 text-sm font-semibold text-deep-olive hover:text-moss"
      >
        {showMap ? t("search:hideMap") : t("search:showMap")}
      </button>

      <div className={`mt-3 grid gap-6 ${showMap ? "lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start" : ""}`}>
        {showMap && (
          <div className="overflow-hidden rounded-lg border border-beige lg:sticky lg:top-4">
            <FieldMap
              center={searchCenter ?? initialCenter}
              shapes={shapes}
              drawMode={null}
              onShapeClick={handleShapeClick}
              fitTo={hasSearched ? fitTo : null}
            />
          </div>
        )}

        {!hasSearched ? (
          <p className="text-wood">{t("search:searchAboveHint")}</p>
        ) : results.length === 0 ? (
          <p className="text-wood">{t("search:noPlotsFoundNearby")}</p>
        ) : (
          <div>
            <p className="text-sm text-warm-olive">{t("search:browseHint")}</p>

            <ul className="mt-2 divide-y divide-beige">
              {farms.map((farm, i) => (
                <li key={farm.farmId}>
                  <Link
                    to={toFarmLink(farm.farmId, locationQuery)}
                    className="flex items-center gap-3 py-4 hover:bg-cream"
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream text-xs font-semibold text-wood"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-forest">{farm.name}</span>
                      <span className="block text-sm text-warm-olive">
                        {t("search:farmDistance", { distance: formatDistance(farm.distanceMeters, numberLocale) })}
                        {" · "}
                        {t("search:nearbyPlotCount", { count: farm.plotCount })}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
