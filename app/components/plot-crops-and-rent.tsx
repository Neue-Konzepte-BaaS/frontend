import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { rentPlot, type Crop, type Rental } from "~/lib/rentals";
import { ApiError } from "~/lib/api-client";
import { roleLabel, type Account } from "~/lib/auth";
import { submitClass, secondaryButtonClass } from "~/components/form";

type PlotCropsAndRentProps = {
  plotId: string;
  crops: Crop[];
  /** Whoever is viewing, any role — a customer gets a real Rent button,
   *  `null` (anonymous) gets "Log in to rent", any other signed-in role
   *  gets a "you can't rent as a farmer" notice. */
  account: Account | null;
  /** Path to return to after logging in, e.g. "/search". Passed to /login?redirect=. */
  loginRedirectTo: string;
  /** Fired after a successful rent, so a caller holding a rentals list can prepend to it. */
  onRented?: (rental: Rental, crop: Crop) => void;
};

type RentState = { status: "renting" } | { status: "error"; message: string };

/**
 * The crops-offered list plus whatever rent affordance fits the viewer,
 * shown once a plot is expanded. Shared by the search results list
 * (plot-search.tsx) and the farm detail page (search/farm.tsx) so the rent
 * flow — crop picking, in-flight state, the 409 error-message mapping —
 * exists in exactly one place.
 */
export function PlotCropsAndRent({ plotId, crops, account, loginRedirectTo, onRented }: PlotCropsAndRentProps) {
  const [selectedCropId, setSelectedCropId] = useState(crops[0]?.id ?? "");
  const [rentState, setRentState] = useState<RentState | null>(null);
  const { t } = useTranslation(["search", "common", "auth"]);
  const isCustomer = account?.role === "customer";

  async function handleRent() {
    const crop = crops.find((c) => c.id === selectedCropId) ?? crops[0];
    if (!crop) return;

    setRentState({ status: "renting" });
    try {
      const rental = await rentPlot(plotId, crop.id);
      onRented?.(rental, crop);
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
      setRentState({ status: "error", message });
    }
  }

  return (
    <>
      {rentState?.status === "error" && <p className="mb-2 text-sm text-red-700">{rentState.message}</p>}

      <p className="text-sm font-medium text-wood">{t("search:availableCrops")}</p>
      {crops.length === 0 ? (
        <p className="mt-1 text-sm text-warm-olive">{t("search:noCropsOffered")}</p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-sm text-wood">
          {crops.map((crop) => (
            <li key={crop.id}>{t("search:cropWithDuration", { name: crop.name, months: crop.durationMonths })}</li>
          ))}
        </ul>
      )}

      {crops.length > 0 &&
        (isCustomer ? (
          <div className="mt-3 flex items-center gap-2">
            <select
              aria-label={t("search:chooseCrop")}
              value={selectedCropId || crops[0].id}
              onChange={(e) => setSelectedCropId(e.target.value)}
              disabled={rentState?.status === "renting"}
              className="rounded-lg border border-beige bg-white px-2 py-2 text-sm text-forest focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss"
            >
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={rentState?.status === "renting"}
              onClick={handleRent}
              className={`${submitClass} w-auto px-4 py-2 text-sm`}
            >
              {rentState?.status === "renting" ? t("search:renting") : t("search:rentButton")}
            </button>
          </div>
        ) : account ? (
          // Signed in, but as a role that can't rent — "Log in to
          // rent" would be misleading (they're not logged out).
          <p className="mt-3 text-sm text-warm-olive">{t("search:cannotRentWrongRole", { role: roleLabel(t, account.role) })}</p>
        ) : (
          <Link
            to={`/login?redirect=${encodeURIComponent(loginRedirectTo)}&intent=rent`}
            className={`${secondaryButtonClass} mt-3 inline-block w-auto px-4 py-2 text-sm`}
          >
            {t("search:loginToRent")}
          </Link>
        ))}
    </>
  );
}
