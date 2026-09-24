import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { rentPlot, type Crop, type Rental } from "~/lib/rentals";
import { ApiError } from "~/lib/api-client";
import { roleLabel, type Account } from "~/lib/auth";
import { formatRentalPeriod } from "~/components/plot-card";
import { FormError, inputClass, submitClass, secondaryButtonClass } from "~/components/form";

/** Isoformat (YYYY-MM-DD) date offset from today by the given number of days, for <input type="date"> min/max. */
function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type PlotCropsAndRentProps = {
  plotId: string;
  plotName: string;
  farmName: string;
  crops: Crop[];
  /** Whoever is viewing, any role — a customer gets the request form,
   *  `null` (anonymous) gets "Log in to rent", any other signed-in role
   *  gets a "you can't rent as a farmer" notice. */
  account: Account | null;
  /** Path to return to after logging in, e.g. "/search". Passed to /login?redirect=. */
  loginRedirectTo: string;
  /** Fired after a successful request, so the caller can mark the plot as taken. */
  onRented?: (rental: Rental, crop: Crop) => void;
};

type RentState = { status: "renting" } | { status: "error"; message: string };

/**
 * What a plot offers plus whatever rent affordance fits the viewer: for a
 * customer, the request form (crop, start date, message) with a preview of
 * the resulting rental period, since each crop fixes how long the rental runs.
 */
export function PlotCropsAndRent({ plotId, plotName, farmName, crops, account, loginRedirectTo, onRented }: PlotCropsAndRentProps) {
  const [selectedCropId, setSelectedCropId] = useState(crops[0]?.id ?? "");
  const [startAt, setStartAt] = useState("");
  const [message, setMessage] = useState("");
  const [rentState, setRentState] = useState<RentState | null>(null);

  const { t, i18n } = useTranslation(["search", "common", "auth"]);
  const locale = i18n.language.startsWith("de") ? "de-DE" : "en-GB";
  const navigate = useNavigate();
  const isCustomer = account?.role === "customer";
  const renting = rentState?.status === "renting";

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

  async function handleRent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCrop || !startAt || !message.trim()) return;

    setRentState({ status: "renting" });
    try {
      const startAtIso = new Date(`${startAt}T00:00:00`).toISOString();
      const rental = await rentPlot(plotId, selectedCrop.id, startAtIso, message.trim());
      onRented?.(rental, selectedCrop);
      setRentState(null);
      navigate(
        `/customer/request-sent?farmName=${encodeURIComponent(farmName)}&plotName=${encodeURIComponent(plotName)}`
      );
    } catch (err) {
      // A 409 covers two distinct, expected outcomes here: a real race on the
      // plot (the backend enforces non-overlapping rentals with a DB
      // exclusion constraint) and picking a crop this plot doesn't offer.
      // Both are told apart by the backend's exact error message. A 400
      // means the start date or message failed the backend's own validation
      // (the client-side checks above should normally prevent this).
      let errorMessage: string;
      if (err instanceof ApiError && err.status === 409 && err.message.includes("already")) {
        errorMessage = t("search:rentConflict");
      } else if (err instanceof ApiError && err.status === 409 && err.message === "crop is not offered by this plot") {
        errorMessage = t("search:cropNotOffered");
      } else if (err instanceof ApiError && err.status === 400) {
        errorMessage = t("search:invalidRentalRequest");
      } else {
        errorMessage = err instanceof ApiError ? err.message : t("common:genericError");
      }
      setRentState({ status: "error", message: errorMessage });
    }
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
            <li key={crop.id}>{t("search:cropWithDuration", { name: crop.name, months: crop.durationMonths })}</li>
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
    <form onSubmit={handleRent} className="space-y-4">
      {rentState?.status === "error" && <FormError message={rentState.message} />}

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
                    disabled={renting}
                    className="h-4 w-4 border-beige text-moss focus:ring-moss"
                  />
                  <span className="font-medium">{crop.name}</span>
                </span>
                <span className="text-warm-olive">{t("search:cropMonths", { count: crop.durationMonths })}</span>
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
          disabled={renting}
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
          disabled={renting}
          rows={3}
          className={`${inputClass} mt-1 block text-sm`}
        />
      </div>

      <button type="submit" disabled={renting || !startAt || !message.trim()} className={`${submitClass} px-4 py-2 text-sm`}>
        {renting ? t("search:renting") : t("search:rentButton")}
      </button>
    </form>
  );
}
