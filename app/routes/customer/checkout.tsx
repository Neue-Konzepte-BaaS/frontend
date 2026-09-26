import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { loadStripe, type Appearance } from "@stripe/stripe-js";
import { CheckoutElementsProvider, useCheckoutElements, PaymentElement, ContactDetailsElement } from "@stripe/react-stripe-js/checkout";
import { Loader2 } from "lucide-react";
import { createCheckoutSession, classifyCheckoutSessionError, type CheckoutSession } from "~/lib/payments";
import { STRIPE_PUBLISHABLE_KEY } from "~/lib/constants";
import { formatPriceCents } from "~/components/plot-card";
import { FormError, primaryButtonClass } from "~/components/form";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("payment:checkoutMetaTitle") }];
}

/** The rental request being paid for — collected by PlotCropsAndRent and handed here via router state. */
export type CheckoutRequest = {
  plotId: string;
  cropId: string;
  /** ISO 8601. */
  startAt: string;
  message: string;
};

// Loaded once at module scope, same as Stripe's own docs recommend — loadStripe
// caches internally, but there's no reason to re-trigger that per render.
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

// Custom Checkout (ui_mode: "elements", see backend/internal/repositories/stripe_gateway.go)
// only themes the Payment/Contact Details Elements it renders — everything
// else on this page is plain HTML/Tailwind, so this is the one place that
// has to hand Stripe our palette explicitly instead of inheriting it from
// app.css. Values mirror app/app.css's --color-* tokens and the rounded-lg /
// inputClass look used by every other form in the app.
const stripeAppearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#524A26", // moss
    colorBackground: "#F3E7C8", // ivory, matches inputClass's bg-ivory
    colorText: "#31311B", // forest
    colorTextSecondary: "#5F572E", // wood
    colorTextPlaceholder: "#9B8D5B", // warm-olive
    colorDanger: "#A96F4A", // error
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSizeBase: "16px",
    borderRadius: "8px", // rounded-lg
    spacingUnit: "4px",
  },
  rules: {
    ".Label": { color: "#5F572E", fontWeight: "500", marginBottom: "4px" },
    ".Input": { border: "1px solid #B4AF8A", boxShadow: "none", padding: "12px 16px" }, // beige border
    ".Input:focus": { border: "1px solid #524A26", boxShadow: "0 0 0 2px #797449" },
    ".Tab": { border: "1px solid #B4AF8A", boxShadow: "none" },
    ".Tab:hover": { color: "#31311B" },
    ".Tab--selected": { border: "1px solid #524A26", backgroundColor: "#F3E7C8" },
    ".TabLabel": { fontWeight: "500" },
    ".Block": { border: "1px solid #B4AF8A", boxShadow: "none" },
  },
};

type SessionState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; session: CheckoutSession };

/**
 * Starts a Stripe Custom Checkout session (ui_mode: "elements") for the
 * request PlotCropsAndRent collected (plotId/cropId/startAt/message, passed
 * via router state — see CheckoutRequest above), then renders the Payment
 * Element ourselves so the form matches the rest of the app instead of
 * Stripe's own prebuilt page (Embedded Checkout's iframe is cross-origin and
 * can't be themed beyond Stripe's own branding_settings knobs).
 *
 * This is a standard automatic-capture Checkout Session: the customer IS
 * charged as soon as they complete it here, before the farmer ever reviews
 * the request. If the farmer later declines, the backend refunds this
 * charge automatically (see backend/internal/handlers/rental_handler.go's
 * DeclineRental). That's called out explicitly in the copy below rather
 * than left implicit — "you're being charged now, and refunded if declined"
 * is exactly the kind of thing a payment page should never leave the
 * customer to guess at.
 */
export default function Checkout() {
  const location = useLocation();
  const request = (location.state ?? null) as CheckoutRequest | null;
  const { t, i18n: i18nInstance } = useTranslation(["payment", "search", "common"]);
  const priceLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const [state, setState] = useState<SessionState>({ status: "loading" });
  // Guards against React re-invoking this effect (StrictMode in dev, or a
  // remount) and firing a second, wasted checkout-session-creation POST.
  const started = useRef(false);

  useEffect(() => {
    if (!request || started.current) return;
    started.current = true;

    createCheckoutSession(request.plotId, request.cropId, request.startAt, request.message)
      .then((session) => setState({ status: "ready", session }))
      .catch((err: unknown) => {
        const classified = classifyCheckoutSessionError(err);
        const message =
          classified.kind === "plotConflict"
            ? t("search:rentConflict")
            : classified.kind === "cropNotOffered"
              ? t("search:cropNotOffered")
              : classified.kind === "invalidRequest"
                ? t("search:invalidRentalRequest")
                : classified.message || t("common:genericError");
        setState({ status: "error", message });
      });
  }, [request, t]);

  if (!request) {
    return (
      <main className="mx-auto max-w-lg p-4">
        <FormError message={t("payment:missingRequest")} />
        <Link to="/search" className="mt-4 inline-block text-sm font-medium text-moss hover:underline">
          {t("search:backToSearch")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg p-4">
      <h1 className="text-2xl font-bold text-forest">{t("payment:checkoutTitle")}</h1>

      {state.status === "loading" && (
        <p className="mt-6 flex items-center gap-2 text-wood">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("payment:startingCheckout")}
        </p>
      )}

      {state.status === "error" && (
        <div className="mt-6 space-y-4">
          <FormError message={state.message} />
          <Link to="/search" className="inline-block text-sm font-medium text-moss hover:underline">
            {t("search:backToSearch")}
          </Link>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <div className="mt-4 rounded-lg border border-beige bg-cream p-4">
            <p className="font-semibold text-forest">{state.session.plotName}</p>
            <p className="text-sm text-wood">{state.session.cropName}</p>
            <p className="mt-2 text-lg font-bold text-forest">{formatPriceCents(state.session.priceCents, priceLocale)}</p>
          </div>

          <p className="mt-4 text-sm text-wood">{t("payment:authorizeNotice")}</p>

          {stripePromise ? (
            <div className="mt-4">
              <CheckoutElementsProvider
                stripe={stripePromise}
                options={{ clientSecret: state.session.clientSecret, elementsOptions: { appearance: stripeAppearance } }}
              >
                <PaymentForm />
              </CheckoutElementsProvider>
            </div>
          ) : (
            <div className="mt-4">
              <FormError message={t("payment:stripeNotConfigured")} />
            </div>
          )}
        </>
      )}
    </main>
  );
}

/** Must render inside CheckoutElementsProvider — useCheckoutElements() reads that context. */
function PaymentForm() {
  const { t } = useTranslation(["payment", "common"]);
  const checkoutState = useCheckoutElements();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (checkoutState.type === "loading") {
    return (
      <p className="flex items-center gap-2 text-wood">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("payment:startingCheckout")}
      </p>
    );
  }

  if (checkoutState.type === "error") {
    return <FormError message={checkoutState.error.message} />;
  }

  const { checkout } = checkoutState;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const result = await checkout.confirm();
      // On success, Stripe navigates the browser to the session's return_url
      // itself (see app/routes/customer/payment-return.tsx) -- this branch
      // only runs for an immediate failure (declined card, validation, etc.).
      if (result.type === "error") {
        setSubmitError(result.error.message);
      }
    } catch {
      // confirm() isn't documented to reject, but a network drop before it
      // gets a response from Stripe could still throw -- without this, the
      // button would be stuck disabled on "Processing…" forever with no
      // way for the customer to retry.
      setSubmitError(t("common:genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ContactDetailsElement />
      <PaymentElement />
      {submitError && <FormError message={submitError} />}
      <button type="submit" disabled={submitting || !checkout.canConfirm} className={`${primaryButtonClass} w-full`}>
        {submitting ? t("payment:processingPayment") : t("payment:payNow")}
      </button>
    </form>
  );
}
