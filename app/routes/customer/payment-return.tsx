import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { getCheckoutSessionStatus, consumeCheckoutReturnTo, decidePollOutcome, type CheckoutSessionStatus } from "~/lib/payments";
import { ApiError } from "~/lib/api-client";
import { FormError } from "~/components/form";
import { primaryButtonClass, secondaryButtonClass } from "~/components/form";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("payment:returnMetaTitle") }];
}

/** How often to re-check the checkout session's status while it's still pending. */
const POLL_INTERVAL_MS = 1500;
/** How long to keep polling before giving up and offering a manual retry —
 *  the webhook that flips "pending" to "completed" usually lands in a
 *  second or two, but can lag under load or a slow local Stripe CLI forward. */
const POLL_TIMEOUT_MS = 20_000;
/** How long the "payment received" confirmation stays visible before
 *  auto-navigating back to the plot. The message is three sentences (refund
 *  policy + notification promise), not a one-word toast — 1.5s (an earlier,
 *  too-hasty value) came and went before anyone could actually read it. ~200
 *  wpm reading speed puts that text at 6-7s; this rounds up from there so a
 *  normal reader finishes with room to spare, while the always-visible
 *  "Continue now" button still lets anyone who doesn't need to read it move
 *  on immediately. */
const SUCCESS_REDIRECT_DELAY_MS = 8000;

type ReturnState = { kind: "polling" } | { kind: "timedOut" } | { kind: "settled"; status: CheckoutSessionStatus } | { kind: "error"; message: string };

/**
 * Where Stripe redirects the top-level page once checkout.confirm() succeeds
 * (return_url's {CHECKOUT_SESSION_ID} placeholder, resolved by Stripe — see
 * app/routes/customer/checkout.tsx). The webhook that actually confirms the
 * charge and creates the rental can lag slightly behind this redirect, so
 * this page polls rather than assuming success the instant it loads.
 */
export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { t } = useTranslation(["payment", "common"]);
  const [state, setState] = useState<ReturnState>({ kind: "polling" });
  const pollStartedAt = useRef<number>(Date.now());
  const navigate = useNavigate();
  // Where to send the customer back to once payment succeeds — the farm
  // page they started from, stashed by plot-crops-and-rent.tsx before
  // checkout (see rememberCheckoutReturnTo). Read exactly once: sessionStorage's
  // one-shot consume would otherwise get raced by React StrictMode's
  // double-invoked effects in dev, silently losing the real value to the
  // second, empty read.
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const consumedReturnTo = useRef(false);

  const poll = useCallback(async () => {
    if (!sessionId) return;
    try {
      const result = await getCheckoutSessionStatus(sessionId);
      setState(decidePollOutcome(result.status, Date.now() - pollStartedAt.current, POLL_TIMEOUT_MS));
    } catch (err) {
      setState({ kind: "error", message: err instanceof ApiError ? err.message : t("common:genericError") });
    }
  }, [sessionId, t]);

  useEffect(() => {
    if (!sessionId) return;
    poll();
    const interval = setInterval(() => {
      setState((prev) => {
        // Stop polling once settled/errored/timed out — only "polling" keeps the interval alive.
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
    if (state.kind !== "settled" || state.status !== "completed" || consumedReturnTo.current) return;
    consumedReturnTo.current = true;
    setRedirectTo(consumeCheckoutReturnTo() ?? "/customer");
  }, [state]);

  useEffect(() => {
    if (!redirectTo) return;
    const timer = setTimeout(() => navigate(redirectTo, { replace: true }), SUCCESS_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [redirectTo, navigate]);

  if (!sessionId) {
    return (
      <main className="mx-auto max-w-lg p-4">
        <FormError message={t("payment:missingSession")} />
        <Link to="/customer" className="mt-4 inline-block text-sm font-medium text-moss hover:underline">
          {t("payment:goToMyRentals")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg p-4">
      <h1 className="text-2xl font-bold text-forest">{t("payment:returnTitle")}</h1>

      {state.kind === "polling" && (
        <p className="mt-6 flex items-center gap-2 text-wood">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("payment:confirmingPayment")}
        </p>
      )}

      {state.kind === "timedOut" && (
        <div className="mt-6 space-y-4">
          <p className="text-wood">{t("payment:stillProcessing")}</p>
          <div className="flex gap-3">
            <button type="button" onClick={retry} className={`${primaryButtonClass} w-auto`}>
              {t("payment:checkAgain")}
            </button>
            <Link to="/customer" className={`${secondaryButtonClass} inline-block w-auto`}>
              {t("payment:goToMyRentals")}
            </Link>
          </div>
        </div>
      )}

      {state.kind === "error" && (
        <div className="mt-6 space-y-4">
          <FormError message={state.message} />
          <Link to="/customer" className="inline-block text-sm font-medium text-moss hover:underline">
            {t("payment:goToMyRentals")}
          </Link>
        </div>
      )}

      {state.kind === "settled" && state.status === "completed" && (
        <div className="mt-6 space-y-4">
          <p className="text-wood">{t("payment:paymentSuccess")}</p>
          {redirectTo && (
            <Link to={redirectTo} replace className={`${primaryButtonClass} inline-block w-auto`}>
              {t("payment:continueNow")}
            </Link>
          )}
        </div>
      )}

      {/* "refunded" isn't realistically reachable this soon after checkout
          (a decline only happens once the farmer reviews the request, well
          after this page), but it's a valid CheckoutSessionStatus, so it's
          handled rather than silently falling through. */}
      {state.kind === "settled" && (state.status === "failed" || state.status === "expired" || state.status === "refunded") && (
        <div className="mt-6 space-y-4">
          <FormError message={t("payment:sessionFailed")} />
          <Link to="/search" className="inline-block text-sm font-medium text-moss hover:underline">
            {t("search:backToSearch")}
          </Link>
        </div>
      )}
    </main>
  );
}
