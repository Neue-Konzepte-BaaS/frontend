import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { loadStripe } from "@stripe/stripe-js";
import { CheckoutElementsProvider, useCheckoutElements, PaymentElement, ContactDetailsElement } from "@stripe/react-stripe-js/checkout";
import { Loader2 } from "lucide-react";
import { createSubscriptionCheckoutSession, type SubscriptionCheckoutSession } from "~/lib/subscriptions";
import { ApiError } from "~/lib/api-client";
import { STRIPE_PUBLISHABLE_KEY } from "~/lib/constants";
import { stripeAppearance } from "~/lib/stripe-appearance";
import { formatPriceCents } from "~/components/plot-card";
import { FormError, primaryButtonClass } from "~/components/form";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("subscription:checkoutMetaTitle") }];
}

/** The chosen plan, handed here via router state from subscribe.tsx. */
export type SubscribeCheckoutRequest = { planId: string };

// Nested inside farmer-layout (see routes.ts) -- its own clientLoader
// already handles role/auth and the subscription-flow exemption, so this
// page needs no clientLoader of its own.

// Loaded once at module scope, same as customer/checkout.tsx.
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

type SessionState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; session: SubscriptionCheckoutSession };

/**
 * Starts a Stripe subscription Checkout session for the plan subscribe.tsx
 * chose, then renders the Payment Element ourselves — directly mirrors
 * customer/checkout.tsx's structure (see that file's own doc comment), but
 * for a recurring subscription instead of a one-time rental payment.
 */
export default function FarmerSubscribeCheckout() {
  const location = useLocation();
  const request = (location.state ?? null) as SubscribeCheckoutRequest | null;
  const { t } = useTranslation(["subscription", "common"]);
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const started = useRef(false);

  useEffect(() => {
    if (!request || started.current) return;
    started.current = true;

    createSubscriptionCheckoutSession(request.planId)
      .then((session) => setState({ status: "ready", session }))
      .catch((err: unknown) => {
        const message =
          err instanceof ApiError && err.status === 409
            ? t("subscription:alreadySubscribed")
            : err instanceof ApiError && err.status === 404
              ? t("subscription:planNotFound")
              : err instanceof ApiError
                ? err.message
                : t("common:genericError");
        setState({ status: "error", message });
      });
  }, [request, t]);

  if (!request) {
    return (
      <main className="mx-auto max-w-lg p-4">
        <FormError message={t("subscription:missingRequest")} />
        <Link to="/farmer/subscribe" className="mt-4 inline-block text-sm font-medium text-moss hover:underline">
          {t("subscription:backToPicker")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg p-4">
      <h1 className="text-2xl font-bold text-forest">{t("subscription:checkoutTitle")}</h1>

      {state.status === "loading" && (
        <p className="mt-6 flex items-center gap-2 text-wood">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("subscription:startingCheckout")}
        </p>
      )}

      {state.status === "error" && (
        <div className="mt-6 space-y-4">
          <FormError message={state.message} />
          <Link to="/farmer/subscribe" className="inline-block text-sm font-medium text-moss hover:underline">
            {t("subscription:backToPicker")}
          </Link>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <div className="mt-4 rounded-lg border border-beige bg-cream p-4">
            <p className="font-semibold text-forest">{t(`subscription:planName_${state.session.planCode}`, { defaultValue: state.session.planCode })}</p>
            <p className="mt-2 text-lg font-bold text-forest">
              {formatPriceCents(state.session.priceCents)}
              <span className="text-sm font-normal text-wood"> {t("subscription:perMonth")}</span>
            </p>
          </div>

          <p className="mt-4 text-sm text-wood">{t("subscription:billingNotice")}</p>

          {stripePromise ? (
            <div className="mt-4">
              <CheckoutElementsProvider
                stripe={stripePromise}
                options={{ clientSecret: state.session.clientSecret, elementsOptions: { appearance: stripeAppearance } }}
              >
                <SubscribePaymentForm />
              </CheckoutElementsProvider>
            </div>
          ) : (
            <div className="mt-4">
              <FormError message={t("subscription:stripeNotConfigured")} />
            </div>
          )}
        </>
      )}
    </main>
  );
}

/** Must render inside CheckoutElementsProvider — useCheckoutElements() reads that context. */
function SubscribePaymentForm() {
  const { t } = useTranslation(["subscription", "common"]);
  const checkoutState = useCheckoutElements();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (checkoutState.type === "loading") {
    return (
      <p className="flex items-center gap-2 text-wood">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("subscription:startingCheckout")}
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
      // itself (see routes/farmer/subscribe-return.tsx) -- this branch only
      // runs for an immediate failure (declined card, validation, etc.).
      if (result.type === "error") {
        setSubmitError(result.error.message);
      }
    } catch {
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
        {submitting ? t("subscription:processingPayment") : t("subscription:subscribeNow")}
      </button>
    </form>
  );
}
