import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { findNearestPlots, rentPlot, type Crop, type NearbyPlot, type Rental } from "~/lib/rentals";
import { ApiError } from "~/lib/api-client";
import { roleLabel, type Account } from "~/lib/auth";
import { FieldMap, type MapShape } from "~/components/map/field-map";
import { toBbox, unionBbox } from "~/lib/geo";
import { formatArea, formatDistance } from "~/components/plot-card";
import { Field as FormField, FormError, inputClass, submitClass, secondaryButtonClass } from "~/components/form";

/**
 * The plot search: a postal-code/city box over `GET /api/plots/nearest`, its
 * results drawn on a map (each numbered) and listed below with distances.
 * Extracted from routes/customer.tsx so the same search backs BOTH the public
 * `/search` page and the logged-in customer dashboard — one implementation,
 * two mounts.
 *
 * Browsing is click-through: a result's number/name is always visible, but
 * what it offers and the rent control only appear once it's selected — by
 * clicking its row or its numbered shape on the map (both share the same
 * selection state). This mirrors the farmer's own plot picker in
 * farmer/field-detail.tsx, just single-select instead of multi.
 *
 * The component owns all search state (query, results, in-flight, errors) and
 * the rent flow. Callers only supply who is looking and what to do afterwards:
 * an anonymous viewer gets a "Log in to rent" link, a customer gets a real
 * Rent button, and a signed-in non-customer (e.g. a farmer browsing /search)
 * gets a plain explanation instead of either — they're not logged out, so
 * "Log in to rent" would be misleading, but they still can't rent. That
 * split is the only behavioural difference between the two pages —
 * everything else here is identical for both.
 */

type PlotSearchProps = {
  /** Whoever is viewing, any role — not pre-filtered by the caller. A
   *  customer gets Rent buttons; `null` (anonymous) gets "Log in to rent";
   *  any other signed-in role gets a "you can't rent as a farmer" notice. */
  account: Account | null;
  /** Plots the viewer already rents — rendered as "Rented ✓" instead of an action. */
  rentedPlotIds?: Set<string>;
  /** Fired after a successful rent, so a caller holding a rentals list can prepend to it. */
  onRented?: (plot: NearbyPlot, rental: Rental, crop: Crop) => void;
  /** Path to return to after logging in, e.g. "/search". Passed to /login?redirect=. */
  loginRedirectTo: string;
};

type RentState = { plotId: string; status: "renting" } | { plotId: string; status: "error"; message: string };

/** How many of the nearest results the map viewport is fitted to — see `fitTo` below. */
const MAP_FIT_RESULT_COUNT = 5;

export function PlotSearch({ account, rentedPlotIds, onRented, loginRedirectTo }: PlotSearchProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<NearbyPlot[]>([]);
  const [rentState, setRentState] = useState<RentState | null>(null);
  // The one result currently expanded to show its crops and rent control —
  // set by clicking either its list row or its numbered shape on the map.
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  // Which crop is picked in each plot's dropdown, keyed by plot id.
  const [selectedCropByPlot, setSelectedCropByPlot] = useState<Record<string, string>>({});
  const { t, i18n } = useTranslation(["search", "common", "auth"]);
  const numberLocale = i18n.language.startsWith("de") ? "de-DE" : "en-GB";

  const rented = rentedPlotIds ?? new Set<string>();
  const isCustomer = account?.role === "customer";

  function toggleSelectPlot(plotId: string) {
    setSelectedPlotId((prev) => (prev === plotId ? null : plotId));
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchError(null);

    const trimmed = query.trim();
    if (!trimmed) {
      setSearchError(t("search:enterPostalCodeOrCity"));
      return;
    }

    setSearching(true);
    try {
      // German postal codes are 4–5 digits; anything else is treated as a city.
      const isPostalCode = /^\d{4,5}$/.test(trimmed);
      const plots = await findNearestPlots(
        isPostalCode ? { postalCode: trimmed, limit: 30 } : { city: trimmed, limit: 30 },
      );
      setResults(plots);
      setHasSearched(true);
      setSelectedPlotId(null);
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

  async function handleRent(plot: NearbyPlot, crop: Crop) {
    setRentState({ plotId: plot.id, status: "renting" });
    try {
      const rental = await rentPlot(plot.id, crop.id);
      onRented?.(plot, rental, crop);
      setRentState(null);
    } catch (err) {
      // A 409 covers two distinct, expected outcomes here: a real race on the
      // plot (the backend enforces non-overlapping rentals with a DB
      // exclusion constraint) and picking a crop this plot doesn't offer.
      // Both are told apart by the backend's exact error message.
      let message: string;
      if (err instanceof ApiError && err.status === 409 && err.message === "plot is already rented") {
        message = t("search:rentConflict");
      } else if (err instanceof ApiError && err.status === 409 && err.message === "crop is not offered by this plot") {
        message = t("search:cropNotOffered");
      } else {
        message = err instanceof ApiError ? err.message : t("common:genericError");
      }
      setRentState({ plotId: plot.id, status: "error", message });
    }
  }

  const shapes: MapShape[] = results.map((p, i) => ({
    id: p.id,
    polygon: p.coordinates,
    variant: "plot" as const,
    label: String(i + 1),
    selected: p.id === selectedPlotId,
  }));
  // Frame the nearest few rather than all 30. Results are sorted nearest-first,
  // and the tail can sit tens of kilometres out — fitting to every one of them
  // zooms so far out that the plots the searcher actually cares about become
  // specks, which reads as "the map didn't move" when a new search returns a
  // similar spread. The closest handful keeps the view tight and legible.
  const fitTo = unionBbox(results.slice(0, MAP_FIT_RESULT_COUNT).map((p) => toBbox(p.coordinates)));

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
        <p className="mt-8 text-gray-600 dark:text-gray-300">{t("search:searchAboveHint")}</p>
      ) : results.length === 0 ? (
        <p className="mt-8 text-gray-600 dark:text-gray-300">{t("search:noPlotsFoundNearby")}</p>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <FieldMap
              center={{ lat: results[0].coordinates.coordinates[0][0][1], lon: results[0].coordinates.coordinates[0][0][0] }}
              shapes={shapes}
              drawMode={null}
              onShapeClick={toggleSelectPlot}
              fitTo={fitTo}
            />
          </div>

          <p className="mt-4 text-sm text-gray-500">{t("search:browseHint")}</p>

          <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800">
            {results.map((plot, i) => {
              const state = rentState?.plotId === plot.id ? rentState : null;
              const alreadyRented = rented.has(plot.id);
              const isSelected = plot.id === selectedPlotId;

              return (
                <li key={plot.id}>
                  <button
                    type="button"
                    onClick={() => toggleSelectPlot(plot.id)}
                    aria-expanded={isSelected}
                    className="flex w-full items-center gap-3 py-4 text-left"
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-gray-900 dark:text-white">{plot.name}</span>
                      <span className="block text-sm text-gray-500">
                        {t("search:distanceAndArea", {
                          distance: formatDistance(plot.distanceMeters, numberLocale),
                          area: formatArea(plot.areaSquareMeters, numberLocale),
                        })}
                      </span>
                    </span>
                    {alreadyRented ? (
                      <span className="shrink-0 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        {t("search:rented")}
                      </span>
                    ) : (
                      <span className="shrink-0 text-gray-400" aria-hidden>
                        {isSelected ? "▾" : "▸"}
                      </span>
                    )}
                  </button>

                  {isSelected && !alreadyRented && (
                    <div className="pb-4 pl-9">
                      {state?.status === "error" && (
                        <p className="mb-2 text-sm text-red-700 dark:text-red-400">{state.message}</p>
                      )}

                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {t("search:availableCrops")}
                      </p>
                      {plot.crops.length === 0 ? (
                        <p className="mt-1 text-sm text-gray-500">{t("search:noCropsOffered")}</p>
                      ) : (
                        <ul className="mt-1 space-y-0.5 text-sm text-gray-600 dark:text-gray-300">
                          {plot.crops.map((crop) => (
                            <li key={crop.id}>
                              {t("search:cropWithDuration", { name: crop.name, months: crop.durationMonths })}
                            </li>
                          ))}
                        </ul>
                      )}

                      {plot.crops.length > 0 &&
                        (isCustomer ? (
                          <div className="mt-3 flex items-center gap-2">
                            <select
                              aria-label={t("search:chooseCrop")}
                              value={selectedCropByPlot[plot.id] ?? plot.crops[0].id}
                              onChange={(e) =>
                                setSelectedCropByPlot((prev) => ({ ...prev, [plot.id]: e.target.value }))
                              }
                              disabled={state?.status === "renting"}
                              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                              {plot.crops.map((crop) => (
                                <option key={crop.id} value={crop.id}>
                                  {crop.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={state?.status === "renting"}
                              onClick={() => {
                                const cropId = selectedCropByPlot[plot.id] ?? plot.crops[0].id;
                                const crop = plot.crops.find((c) => c.id === cropId);
                                if (crop) handleRent(plot, crop);
                              }}
                              className={`${submitClass} w-auto px-4 py-2 text-sm`}
                            >
                              {state?.status === "renting" ? t("search:renting") : t("search:rentButton")}
                            </button>
                          </div>
                        ) : account ? (
                          // Signed in, but as a role that can't rent — "Log in to
                          // rent" would be misleading (they're not logged out).
                          <p className="mt-3 text-sm text-gray-500">
                            {t("search:cannotRentWrongRole", { role: roleLabel(t, account.role) })}
                          </p>
                        ) : (
                          <Link
                            to={`/login?redirect=${encodeURIComponent(loginRedirectTo)}&intent=rent`}
                            className={`${secondaryButtonClass} mt-3 inline-block w-auto px-4 py-2 text-sm`}
                          >
                            {t("search:loginToRent")}
                          </Link>
                        ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
