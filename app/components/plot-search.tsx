import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { findNearestPlots, groupPlotsByFarm, type NearbyFarm, type NearbyPlot } from "~/lib/rentals";
import { getFarm } from "~/lib/farms";
import { ApiError } from "~/lib/api-client";
import { FieldMap, type MapShape } from "~/components/map/field-map";
import { toBbox, unionBbox } from "~/lib/geo";
import { formatDistance } from "~/components/plot-card";
import { Field as FormField, FormError, inputClass, submitClass } from "~/components/form";

/**
 * The plot search: a postal-code/city box over `GET /api/plots/nearest`,
 * shown on a map (each plot numbered) with the farms behind those plots
 * listed below, nearest first. This is a farm directory, not a plot
 * browser — what a farm offers and the rent flow live on its own page
 * (search/farm.tsx, reached by clicking a farm here). The same postalCode/
 * city query is carried along in that link (see toFarmLink below), since
 * that page re-runs this same search scoped to one farm rather than calling
 * a dedicated "this farm's plots" endpoint, which doesn't exist.
 */

type FarmResult = NearbyFarm & { name: string };

/** How many of the nearest results the map viewport is fitted to — see `fitTo` below. */
const MAP_FIT_RESULT_COUNT = 5;

/** The farm detail page's URL, carrying the search that led here — see search/farm.tsx's clientLoader. */
function toFarmLink(farmId: string, locationQuery: URLSearchParams) {
  return `/search/farms/${farmId}?${locationQuery.toString()}`;
}

export function PlotSearch() {
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
  const { t, i18n } = useTranslation(["search", "common"]);
  const numberLocale = i18n.language.startsWith("de") ? "de-DE" : "en-GB";

  async function runSearch(trimmed: string) {
    setSearchError(null);
    setSearching(true);
    try {
      // German postal codes are 4–5 digits; anything else is treated as a city.
      const isPostalCode = /^\d{4,5}$/.test(trimmed);
      const plots = await findNearestPlots(
        isPostalCode ? { postalCode: trimmed, limit: 30 } : { city: trimmed, limit: 30 },
      );
      const farmSummaries = groupPlotsByFarm(plots);
      // The nearest-plots endpoint only carries each plot's farm id, not its
      // name — one lookup per distinct nearby farm to fill that in.
      const farmDetails = await Promise.all(farmSummaries.map((f) => getFarm(f.farmId)));

      const newLocationQuery = new URLSearchParams(isPostalCode ? { postalCode: trimmed } : { city: trimmed });
      setResults(plots);
      setFarms(farmSummaries.map((f, i) => ({ ...f, name: farmDetails[i].name })));
      setLocationQuery(newLocationQuery);
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
  // farm's page) instead of showing a blank search box the visitor already filled in.
  useEffect(() => {
    if (query) runSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only, using the URL's initial value.
  }, []);

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
  const fitTo = unionBbox(results.slice(0, MAP_FIT_RESULT_COUNT).map((p) => toBbox(p.coordinates)));

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

      {!hasSearched ? (
        <p className="mt-8 text-wood">{t("search:searchAboveHint")}</p>
      ) : results.length === 0 ? (
        <p className="mt-8 text-wood">{t("search:noPlotsFoundNearby")}</p>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-lg border border-beige">
            <FieldMap
              center={{ lat: results[0].coordinates.coordinates[0][0][1], lon: results[0].coordinates.coordinates[0][0][0] }}
              shapes={shapes}
              drawMode={null}
              onShapeClick={handleShapeClick}
              fitTo={fitTo}
            />
          </div>

          <p className="mt-4 text-sm text-warm-olive">{t("search:browseHint")}</p>

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
        </>
      )}
    </>
  );
}
