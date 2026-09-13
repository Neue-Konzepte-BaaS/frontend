import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/customer";
import { resolveOptionalRole } from "~/lib/guards";
import {
  findNearestPlots,
  rentPlot,
  listMyRentals,
  type NearbyPlot,
  type RentalWithPlot,
} from "~/lib/rentals";
import { ApiError } from "~/lib/api-client";
import { FieldMap, type MapShape } from "~/components/map/field-map";
import { toBbox, unionBbox } from "~/lib/geo";
import { PlotCard, formatDistance } from "~/components/plot-card";
import { Field as FormField, FormError, inputClass, submitClass, secondaryButtonClass } from "~/components/form";
import { LogoutButton } from "~/components/logout-button";

export function meta() {
  return [{ title: "Find fields near you · BaaS" }];
}

/**
 * Works for both anonymous visitors and logged-in customers — this page
 * doubles as the public plot search AND (when logged in as a customer) the
 * customer's own dashboard, per architecture.md's routing conventions. A
 * farmer/admin landing here is redirected to their own dashboard by
 * resolveOptionalRole, same as requireRole would.
 */
export async function clientLoader() {
  const account = await resolveOptionalRole("customer");
  const rentals = account ? await listMyRentals() : [];
  return { account, rentals };
}

type RentState = { plotId: string; status: "renting" } | { plotId: string; status: "error"; message: string };

export default function CustomerPage({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<NearbyPlot[]>([]);

  const [rentals, setRentals] = useState<RentalWithPlot[]>(loaderData.rentals);
  const [rentState, setRentState] = useState<RentState | null>(null);

  const rentedPlotIds = new Set(rentals.map((r) => r.plotId));

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchError(null);

    const trimmed = query.trim();
    if (!trimmed) {
      setSearchError("Enter a postal code or a city.");
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
        setSearchError("We couldn't find that postal code or city — try another.");
      } else {
        setSearchError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleRent(plot: NearbyPlot) {
    setRentState({ plotId: plot.id, status: "renting" });
    try {
      const rental = await rentPlot(plot.id);
      setRentals((prev) => [{ ...rental, plot: { id: plot.id, name: plot.name, field: plot.field, coordinates: plot.coordinates } }, ...prev]);
      setRentState(null);
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 409
          ? "Someone just rented this plot — try another."
          : err instanceof ApiError
            ? err.message
            : "Something went wrong. Please try again.";
      setRentState({ plotId: plot.id, status: "error", message });
    }
  }

  const shapes: MapShape[] = results.map((p) => ({ id: p.id, polygon: p.coordinates, variant: "plot" as const }));
  const fitTo = unionBbox(results.map((p) => toBbox(p.coordinates)));

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Bauer as a Service</p>
          {account ? (
            <div className="flex items-center gap-3">
              <p className="hidden font-mono text-xs text-gray-400 sm:block dark:text-gray-500">{account.id}</p>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="whitespace-nowrap text-sm font-medium text-gray-700 hover:underline dark:text-gray-200"
              >
                Sign in
              </Link>
              <Link to="/register" className={`${submitClass} inline-block w-auto px-4 py-2 text-sm`}>
                Create account
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Find fields near you</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Search a German postal code or city to see available self-harvest plots nearby.
        </p>

        <form onSubmit={handleSearch} className="mt-4 flex max-w-md gap-3" noValidate>
          <div className="flex-1">
            <FormField label="Postal code or city" htmlFor="search">
              <input
                id="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. 76133 or Karlsruhe"
                className={inputClass}
              />
            </FormField>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={searching} className={`${submitClass} w-auto px-6`}>
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
        </form>

        {searchError && (
          <div className="mt-3 max-w-md">
            <FormError message={searchError} />
          </div>
        )}

        {!hasSearched ? (
          <p className="mt-8 text-gray-600 dark:text-gray-300">
            Search above to see plots available near you.
          </p>
        ) : results.length === 0 ? (
          <p className="mt-8 text-gray-600 dark:text-gray-300">
            No available plots found near there right now.
          </p>
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
                const alreadyRented = rentedPlotIds.has(plot.id);

                return (
                  <PlotCard
                    key={plot.id}
                    name={plot.name}
                    meta={
                      <>
                        {formatDistance(plot.distanceMeters)} away
                        {state?.status === "error" && (
                          <span className="mt-1 block text-red-700 dark:text-red-400">{state.message}</span>
                        )}
                      </>
                    }
                    action={
                      alreadyRented ? (
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Rented ✓</span>
                      ) : account ? (
                        <button
                          type="button"
                          disabled={state?.status === "renting"}
                          onClick={() => handleRent(plot)}
                          className={`${submitClass} w-auto px-4 py-2 text-sm`}
                        >
                          {state?.status === "renting" ? "Renting…" : "Rent"}
                        </button>
                      ) : (
                        <Link
                          to="/login?redirect=/customer"
                          className={`${secondaryButtonClass} inline-block w-auto px-4 py-2 text-sm`}
                        >
                          Log in to rent
                        </Link>
                      )
                    }
                  />
                );
              })}
            </ul>
          </>
        )}

        {account && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My rentals</h2>
            {rentals.length === 0 ? (
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                You haven't rented a plot yet — search above to find one.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800">
                {rentals.map((rental) => (
                  <PlotCard
                    key={rental.id}
                    name={rental.plot.name}
                    meta={formatRentalPeriod(rental.startAt, rental.endAt)}
                    action={<span className="text-sm text-gray-500">Booked</span>}
                  />
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function formatRentalPeriod(startAt: string, endAt: string): string {
  return `${dateFormatter.format(new Date(startAt))} – ${dateFormatter.format(new Date(endAt))}`;
}
