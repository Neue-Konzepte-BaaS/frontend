import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { PlotCropOffering } from "~/lib/rentals";
import { roleLabel, type Account } from "~/lib/auth";
import { inputClass, submitClass, secondaryButtonClass } from "~/components/form";
import { formatPriceCents } from "~/components/plot-card";
import { rememberCheckoutReturnTo } from "~/lib/payments";
import type { CheckoutRequest } from "~/routes/customer/checkout";

/** Isoformat (YYYY-MM-DD) date offset from today by the given number of days, for <input type="date"> min/max. */
function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type PlotCropsAndRentProps = {
  plotId: string;
  crops: PlotCropOffering[];
  /** Whoever is viewing, any role — a customer gets a real Rent button,
   *  `null` (anonymous) gets "Log in to rent", any other signed-in role
   *  gets a "you can't rent as a farmer" notice. */
  account: Account | null;
  /** Path to return to after logging in, e.g. "/search". Passed to /login?redirect=. */
  loginRedirectTo: string;
  /**
   * Where the browser should land once payment resolves — the farm page
   * this component is rendered on, so the customer sees their plot marked
   * "Requested" rather than a generic confirmation screen. Stashed via
   * rememberCheckoutReturnTo before navigating to checkout, since Stripe's
   * own redirect back drops React Router state (see that function's docs).
   */
  returnTo: string;
};

/**
 * The crops-offered list plus whatever rent affordance fits the viewer,
 * shown once a plot is expanded. Shared by the search results list
 * (plot-search.tsx) and the farm detail page (search/farm.tsx) so the
 * request-a-plot flow — crop picking, date/message collection — exists in
 * exactly one place.
 *
 * Submitting here does NOT create a rental request itself: it navigates to
 * /customer/checkout carrying the collected {plotId, cropId, startAt,
 * message} via router state (not a query string — `message` is free text a
 * customer could write a paragraph into, which doesn't belong URL-encoded
 * in a bookmarkable link the way e.g. postalCode does elsewhere in this
 * app). The checkout page is what actually calls createCheckoutSession and
 * surfaces its 404/409/400 errors — this component no longer talks to the
 * backend at all.
 */
export function PlotCropsAndRent({ plotId, crops, account, loginRedirectTo, returnTo }: PlotCropsAndRentProps) {
  const [selectedCropId, setSelectedCropId] = useState(crops[0]?.id ?? "");
  const [startAt, setStartAt] = useState("");
  const [message, setMessage] = useState("");
  const { t, i18n } = useTranslation(["search", "common", "auth"]);
  const navigate = useNavigate();
  const isCustomer = account?.role === "customer";

  // The backend requires startAt 1-60 days out — computed once per mount
  // rather than on every render, since "today" doesn't change mid-session.
  const minStartAt = useMemo(() => isoDateOffset(1), []);
  const maxStartAt = useMemo(() => isoDateOffset(60), []);

  function handleContinue() {
    const crop = crops.find((c) => c.id === selectedCropId) ?? crops[0];
    if (!crop || !startAt || !message.trim()) return;

    const startAtIso = new Date(`${startAt}T00:00:00`).toISOString();
    const state: CheckoutRequest = { plotId, cropId: crop.id, startAt: startAtIso, message: message.trim() };
    rememberCheckoutReturnTo(returnTo);
    navigate("/customer/checkout", { state });
  }

  const priceLocale = i18n.language.startsWith("de") ? "de-DE" : "en-GB";

  return (
    <>
      <p className="text-sm font-medium text-wood">{t("search:availableCrops")}</p>
      {crops.length === 0 ? (
        <p className="mt-1 text-sm text-warm-olive">{t("search:noCropsOffered")}</p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-sm text-wood">
          {crops.map((crop) => (
            <li key={crop.id}>
              {t("search:cropWithDurationAndPrice", {
                name: crop.name,
                months: crop.durationMonths,
                price: formatPriceCents(crop.priceCents, priceLocale),
              })}
            </li>
          ))}
        </ul>
      )}

      {crops.length > 0 &&
        (isCustomer ? (
          <div className="mt-3 space-y-2">
            <select
              aria-label={t("search:chooseCrop")}
              value={selectedCropId || crops[0].id}
              onChange={(e) => setSelectedCropId(e.target.value)}
              className="rounded-lg border border-beige bg-white px-2 py-2 text-sm text-forest focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss"
            >
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              aria-label={t("search:rentStartDateLabel")}
              value={startAt}
              min={minStartAt}
              max={maxStartAt}
              onChange={(e) => setStartAt(e.target.value)}
              className={`${inputClass} block text-sm`}
            />
            <textarea
              aria-label={t("search:rentMessageLabel")}
              placeholder={t("search:rentMessagePlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className={`${inputClass} block text-sm`}
            />
            <button
              type="button"
              disabled={!startAt || !message.trim()}
              onClick={handleContinue}
              className={`${submitClass} w-auto px-4 py-2 text-sm`}
            >
              {t("search:continueToPayment")}
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
