import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { getSubscriptionStatus, decideSubscriptionPollOutcome, type SubscriptionStatus } from "~/lib/subscriptions";
import { ApiError } from "~/lib/api-client";
import { FormError, primaryButtonClass, secondaryButtonClass } from "~/components/form";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("subscription:returnMetaTitle") }];
}

// Nested inside farmer-layout (see routes.ts) -- its own clientLoader
// already handles role/auth and the subscription-flow exemption, so this
// page needs no clientLoader of its own.

/** How often to re-check subscription status while it's still pending. */
const POLL_INTERVAL_MS = 1500;
/** How long to keep polling before offering a manual retry — mirrors payment-return.tsx's timeout. */
const POLL_TIMEOUT_MS = 20_000;
/** How long the "subscribed" confirmation stays visible before auto-navigating to the dashboard. */
const SUCCESS_REDIRECT_DELAY_MS = 5000;

type ReturnState = { kind: "polling" } | { kind: "timedOut" } | { kind: "settled"; status: SubscriptionStatus } | { kind: "error"; message: string };

/**
 * Where Stripe redirects the top-level page once checkout.confirm() succeeds
 * (return_url's {CHECKOUT_SESSION_ID} placeholder — see
 * subscribe-checkout.tsx). The webhook that actually activates the
 * subscription can lag slightly behind this redirect, so this page polls
 * GET /subscriptions/me rather than assuming success immediately. Directly
 * mirrors customer/payment-return.tsx's poll loop, but against the
 * subscription's own "active" terminal status instead of a checkout
 * session's "completed" — and always lands back on /farmer, never a stashed
 * return-to location, since there's no "page the farmer started from" the
 * way a rental checkout has.
 */
export default function FarmerSubscribeReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { t } = useTranslation(["subscription", "common"]);
  const [state, setState] = useState<ReturnState>({ kind: "polling" });
  const pollStartedAt = useRef<number>(Date.now());
  const navigate = useNavigate();
  const redirectStarted = useRef(false);

  const poll = useCallback(async () => {
    try {
      const sub = await getSubscriptionStatus();
      setState(decideSubscriptionPollOutcome(sub.status, Date.now() - pollStartedAt.current, POLL_TIMEOUT_MS));
    } catch (err) {
      setState({ kind: "error", message: err instanceof ApiError ? err.message : t("common:genericError") });
    }
  }, [t]);

  useEffect(() => {
    if (!sessionId) return;
    poll();
    const interval = setInterval(() => {
      setState((prev) => {
        if (prev.kind === "polling") poll();
        return prev;
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sessionId, poll]);

  function retry() {
    pollStartedAt.current = Date.now();
    setState({ kind: "polling" });
    poll();
  }

  useEffect(() => {
    if (state.kind !== "settled" || state.status !== "active" || redirectStarted.current) return;
    redirectStarted.current = true;
    const timer = setTimeout(() => navigate("/farmer", { replace: true }), SUCCESS_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, navigate]);

  if (!sessionId) {
    return (
      <main className="mx-auto max-w-lg p-4">
        <FormError message={t("subscription:missingSession")} />
        <Link to="/farmer/subscribe" className="mt-4 inline-block text-sm font-medium text-moss hover:underline">
          {t("subscription:backToPicker")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg p-4">
      <h1 className="text-2xl font-bold text-forest">{t("subscription:returnTitle")}</h1>

      {state.kind === "polling" && (
        <div className="mt-6 space-y-4">
          <p className="flex items-center gap-2 text-wood">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("subscription:confirmingSubscription")}
          </p>
          {/* Not trapped even mid-poll: the webhook that activates a
              subscription is usually near-instant but can lag, and a
              farmer should always have a way off this page rather than
              waiting on a spinner with no escape. */}
          <Link to="/farmer/subscribe" className="inline-block text-sm font-medium text-moss hover:underline">
            {t("subscription:backToPicker")}
          </Link>
        </div>
      )}

      {state.kind === "timedOut" && (
        <div className="mt-6 space-y-4">
          <p className="text-wood">{t("subscription:stillProcessing")}</p>
          <div className="flex gap-3">
            <button type="button" onClick={retry} className={`${primaryButtonClass} w-auto`}>
              {t("subscription:checkAgain")}
            </button>
            <Link to="/farmer/subscribe" className={`${secondaryButtonClass} inline-block w-auto`}>
              {t("subscription:backToPicker")}
            </Link>
          </div>
        </div>
      )}

      {state.kind === "error" && (
        <div className="mt-6 space-y-4">
          <FormError message={state.message} />
          <Link to="/farmer/subscribe" className="inline-block text-sm font-medium text-moss hover:underline">
            {t("subscription:backToPicker")}
          </Link>
        </div>
      )}

      {state.kind === "settled" && state.status === "active" && (
        <div className="mt-6 space-y-4">
          <p className="text-wood">{t("subscription:subscribeSuccess")}</p>
          <Link to="/farmer" replace className={`${primaryButtonClass} inline-block w-auto`}>
            {t("subscription:continueNow")}
          </Link>
        </div>
      )}

      {/* "pending" cannot reach here: decideSubscriptionPollOutcome only
          "settles" on a non-pending status, so this covers past_due (the
          first payment itself failed) and canceled (the checkout session
          expired unpaid). */}
      {state.kind === "settled" && (state.status === "past_due" || state.status === "canceled") && (
        <div className="mt-6 space-y-4">
          <FormError message={t("subscription:sessionFailed")} />
          <Link to="/farmer/subscribe" className="inline-block text-sm font-medium text-moss hover:underline">
            {t("subscription:backToPicker")}
          </Link>
        </div>
      )}
    </main>
  );
}
