import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { PlotCropOffering } from "~/lib/rentals";
import { roleLabel, type Account } from "~/lib/auth";
import { formatPriceCents, formatRentalPeriod } from "~/components/plot-card";
import { inputClass, submitClass, secondaryButtonClass } from "~/components/form";
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
  /** Whoever is viewing, any role — a customer gets the request form,
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
 * What a plot offers plus whatever rent affordance fits the viewer: for a
 * customer, the request form (crop, start date, message) with a preview of
 * the resulting rental period and each crop's price, since each crop fixes
 * how long — and, combined with the plot's/farm's rates, how much — the
 * rental costs.
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
  const locale = i18n.language.startsWith("de") ? "de-DE" : "en-GB";
  const navigate = useNavigate();
  const isCustomer = account?.role === "customer";

  // The backend requires startAt 1-60 days out — computed once per mount
  // rather than on every render, since "today" doesn't change mid-session.
  const minStartAt = useMemo(() => isoDateOffset(1), []);
  const maxStartAt = useMemo(() => isoDateOffset(60), []);

  const selectedCrop = crops.find((c) => c.id === selectedCropId) ?? crops[0];

  let periodPreview: string | null = null;
  if (selectedCrop && startAt) {
    const start = new Date(`${startAt}T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + selectedCrop.durationMonths);
    periodPreview = formatRentalPeriod(start.toISOString(), end.toISOString(), locale);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCrop || !startAt || !message.trim()) return;

    const startAtIso = new Date(`${startAt}T00:00:00`).toISOString();
    const state: CheckoutRequest = { plotId, cropId: selectedCrop.id, startAt: startAtIso, message: message.trim() };
    rememberCheckoutReturnTo(returnTo);
    navigate("/customer/checkout", { state });
  }

  if (crops.length === 0) {
    return <p className="text-sm text-warm-olive">{t("search:noCropsOffered")}</p>;
  }

  if (!isCustomer) {
    return (
      <>
        <p className="text-sm font-medium text-wood">{t("search:availableCrops")}</p>
        <ul className="mt-1 space-y-0.5 text-sm text-wood">
          {crops.map((crop) => (
            <li key={crop.id}>
              {t("search:cropWithDurationAndPrice", {
                name: crop.name,
                months: crop.durationMonths,
                price: formatPriceCents(crop.priceCents, locale),
              })}
            </li>
          ))}
        </ul>
        {account ? (
          // Signed in, but as a role that can't rent — "Log in to rent"
          // would be misleading (they're not logged out).
          <p className="mt-3 text-sm text-warm-olive">{t("search:cannotRentWrongRole", { role: roleLabel(t, account.role) })}</p>
        ) : (
          <Link
            to={`/login?redirect=${encodeURIComponent(loginRedirectTo)}&intent=rent`}
            className={`${secondaryButtonClass} mt-3 block w-full px-4 py-2 text-center text-sm`}
          >
            {t("search:loginToRent")}
          </Link>
        )}
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-wood">{t("search:chooseCrop")}</legend>
        <div className="mt-2 grid gap-2">
          {crops.map((crop) => {
            const checked = crop.id === selectedCrop?.id;
            return (
              <label
                key={crop.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  checked ? "border-moss bg-moss/10 text-forest" : "border-beige bg-white text-wood hover:bg-cream"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`crop-${plotId}`}
                    value={crop.id}
                    checked={checked}
                    onChange={() => setSelectedCropId(crop.id)}
                    className="h-4 w-4 border-beige text-moss focus:ring-moss"
                  />
                  <span className="font-medium">{crop.name}</span>
                </span>
                <span className="text-warm-olive">
                  {t("search:cropMonths", { count: crop.durationMonths })} · {formatPriceCents(crop.priceCents, locale)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`start-${plotId}`} className="text-sm font-medium text-wood">
          {t("search:rentStartDateLabel")}
        </label>
        <input
          id={`start-${plotId}`}
          type="date"
          required
          value={startAt}
          min={minStartAt}
          max={maxStartAt}
          onChange={(e) => setStartAt(e.target.value)}
          className={`${inputClass} mt-1 block text-sm`}
        />
        <p className="mt-1 text-xs text-warm-olive">
          {periodPreview ? t("search:rentPeriodPreview", { period: periodPreview }) : t("search:rentStartDateHint")}
        </p>
      </div>

      <div>
        <label htmlFor={`message-${plotId}`} className="text-sm font-medium text-wood">
          {t("search:rentMessageLabel")}
        </label>
        <textarea
          id={`message-${plotId}`}
          required
          placeholder={t("search:rentMessagePlaceholder")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className={`${inputClass} mt-1 block text-sm`}
        />
      </div>

      <button type="submit" disabled={!startAt || !message.trim()} className={`${submitClass} px-4 py-2 text-sm`}>
        {t("search:continueToPayment")}
      </button>
    </form>
  );
}
