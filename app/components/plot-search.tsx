import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { findNearestPlots, rentPlot, type NearbyPlot, type Rental } from "~/lib/rentals";
import { ApiError } from "~/lib/api-client";
import { roleLabel, type Account } from "~/lib/auth";
import { FieldMap, type MapShape } from "~/components/map/field-map";
import { toBbox, unionBbox } from "~/lib/geo";
import { PlotCard, formatDistance } from "~/components/plot-card";
import { Field as FormField, FormError, inputClass, submitClass, secondaryButtonClass } from "~/components/form";

/**
 * The plot search: a postal-code/city box over `GET /api/plots/nearest`, its
 * results drawn on a map and listed with distances. Extracted from
 * routes/customer.tsx so the same search backs BOTH the public `/search` page
 * and the logged-in customer dashboard — one implementation, two mounts.
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
  onRented?: (plot: NearbyPlot, rental: Rental) => void;
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
  const { t, i18n } = useTranslation(["search", "common", "auth"]);
  const numberLocale = i18n.language.startsWith("de") ? "de-DE" : "en-GB";

  const rented = rentedPlotIds ?? new Set<string>();
  const isCustomer = account?.role === "customer";

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

  async function handleRent(plot: NearbyPlot) {
    setRentState({ plotId: plot.id, status: "renting" });
    try {
      const rental = await rentPlot(plot.id);
      onRented?.(plot, rental);
      setRentState(null);
    } catch (err) {
      // A 409 is a real race, not a theoretical one — the backend enforces
      // non-overlapping rentals with a DB exclusion constraint.
      const message =
        err instanceof ApiError && err.status === 409
          ? t("search:rentConflict")
          : err instanceof ApiError
            ? err.message
            : t("common:genericError");
      setRentState({ plotId: plot.id, status: "error", message });
    }
  }

  const shapes: MapShape[] = results.map((p) => ({ id: p.id, polygon: p.coordinates, variant: "plot" as const }));
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
              fitTo={fitTo}
            />
          </div>

          <ul className="mt-6 divide-y divide-gray-200 dark:divide-gray-800">
            {results.map((plot) => {
              const state = rentState?.plotId === plot.id ? rentState : null;
              const alreadyRented = rented.has(plot.id);

              return (
                <PlotCard
                  key={plot.id}
                  name={plot.name}
                  meta={
                    <>
                      {t("search:distanceAway", { distance: formatDistance(plot.distanceMeters, numberLocale) })}
                      {state?.status === "error" && (
                        <span className="mt-1 block text-red-700 dark:text-red-400">{state.message}</span>
                      )}
                    </>
                  }
                  action={
                    alreadyRented ? (
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        {t("search:rented")}
                      </span>
                    ) : isCustomer ? (
                      <button
                        type="button"
                        disabled={state?.status === "renting"}
                        onClick={() => handleRent(plot)}
                        className={`${submitClass} w-auto px-4 py-2 text-sm`}
                      >
                        {state?.status === "renting" ? t("search:renting") : t("search:rentButton")}
                      </button>
                    ) : account ? (
                      // Signed in, but as a role that can't rent — "Log in to
                      // rent" would be misleading (they're not logged out).
                      <span className="text-sm text-gray-500">
                        {t("search:cannotRentWrongRole", { role: roleLabel(t, account.role) })}
                      </span>
                    ) : (
                      <Link
                        to={`/login?redirect=${encodeURIComponent(loginRedirectTo)}&intent=rent`}
                        className={`${secondaryButtonClass} inline-block w-auto px-4 py-2 text-sm`}
                      >
                        {t("search:loginToRent")}
                      </Link>
                    )
                  }
                />
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
