import { apiClient, ApiError } from "~/lib/api-client";
import type { Rental } from "~/lib/rentals";

/**
 * Stripe checkout API wrappers. See backend/internal/handlers/payment_handler.go
 * for the authoritative contract:
 *
 *   POST /api/payments/checkout-sessions            -> CheckoutSession (customer only)
 *   GET  /api/payments/checkout-sessions/{sessionId} -> CheckoutSessionResult (customer only, own session)
 *
 * This is a "pay to apply" flow: the customer pays when submitting the
 * request, before the farmer ever sees it — a standard Stripe Checkout
 * session (automatic capture) using Custom Checkout's Payment Element (see
 * app/routes/customer/checkout.tsx), so the card IS charged as soon as
 * checkout completes, not just authorized. A `rental` is created only once
 * that charge is confirmed (via a backend webhook, never on the
 * checkout-session-creation call itself), with status "requested". If the
 * farmer later declines, the backend refunds the charge automatically (see
 * `DeclineRental` in the backend's rental_handler.go) — approving does
 * nothing payment-related, since the money already moved at checkout time.
 * `createCheckoutSession` fully replaces the old direct
 * `rentPlot`/`POST /api/rentals` call: nothing should create a rental
 * without going through payment first.
 */

export type CheckoutSession = {
  clientSecret: string;
  plotName: string;
  cropName: string;
  priceCents: number;
};

/**
 * The checkout session's own status — distinct from the resulting rental's
 * requested/approved/declined status once it exists.
 *   pending:   session created, payment not yet completed.
 *   completed: paid, and a rental was created from it.
 *   failed:    paid, but no rental could be created (e.g. the plot was taken
 *              by a concurrent payment) — refunded automatically.
 *   expired:   the Stripe session expired unpaid.
 *   refunded:  paid and a rental was created, but the farmer later declined
 *              it — refunded, same as failed. Not expected to appear this
 *              soon after checkout (a decline happens well after the
 *              customer has left this page), but handled for completeness.
 */
export type CheckoutSessionStatus = "pending" | "completed" | "failed" | "expired" | "refunded";

export type CheckoutSessionResult = {
  status: CheckoutSessionStatus;
  rental?: Rental;
};

/**
 * Starts a Stripe Checkout session requesting `plotId` with
 * `cropId`, starting `startAt` (ISO 8601, must be 1-60 days out), with
 * `message` to the farmer — the same request payload `rentPlot` used to
 * send directly. Throws the same expected outcomes: ApiError(409, "...
 * already ...") on an overlapping request, ApiError(409, "crop is not
 * offered by this plot"), ApiError(400) on an invalid startAt/message, or
 * ApiError(404) if the plot or crop doesn't exist. No rental is created by
 * this call; it only starts the charge and stages the request.
 */
export function createCheckoutSession(
  plotId: string,
  cropId: string,
  startAt: string,
  message: string,
): Promise<CheckoutSession> {
  return apiClient.post<CheckoutSession>("/payments/checkout-sessions", { plotId, cropId, startAt, message });
}

/**
 * Polls the status of a checkout session by its Stripe session id (the
 * `session_id` query param Stripe's return_url carries back). `rental` is
 * only present once `status === "completed"`.
 */
export function getCheckoutSessionStatus(sessionId: string): Promise<CheckoutSessionResult> {
  return apiClient.get<CheckoutSessionResult>(`/payments/checkout-sessions/${sessionId}`);
}

export type CheckoutRequestErrorKind = "plotConflict" | "cropNotOffered" | "invalidRequest" | "other";

/**
 * Classifies an error thrown by createCheckoutSession into one of its
 * documented expected outcomes (see that function's own docs) so a caller
 * can show a specific, translated message for each rather than a generic
 * fallback. Pulled out of checkout.tsx's error handling so the branching —
 * which status code plus which exact backend message string means what —
 * has one independently testable home instead of living only inside a
 * `.catch()`. `message` is only ever the raw backend string for `"other"`
 * (an unexpected ApiError callers may still want to show); the three
 * expected kinds carry their own translated copy at the call site instead.
 */
export function classifyCheckoutSessionError(err: unknown): { kind: CheckoutRequestErrorKind; message: string } {
  if (err instanceof ApiError && err.status === 409 && err.message.includes("already")) {
    return { kind: "plotConflict", message: err.message };
  }
  if (err instanceof ApiError && err.status === 409 && err.message === "crop is not offered by this plot") {
    return { kind: "cropNotOffered", message: err.message };
  }
  if (err instanceof ApiError && err.status === 400) {
    return { kind: "invalidRequest", message: err.message };
  }
  return { kind: "other", message: err instanceof ApiError ? err.message : "" };
}

export type PollOutcome = { kind: "polling" } | { kind: "timedOut" } | { kind: "settled"; status: CheckoutSessionStatus };

/**
 * Decides what payment-return.tsx's poll loop should do next, given the
 * checkout session's latest status and how long it's been polling. Pulled
 * out of the poll loop's setInterval callback so the timeout boundary is
 * one tested expression instead of inline, easy-to-miscompare logic (e.g.
 * `>=` vs `>` at the exact timeout instant).
 */
export function decidePollOutcome(status: CheckoutSessionStatus, elapsedMs: number, timeoutMs: number): PollOutcome {
  if (status !== "pending") return { kind: "settled", status };
  return elapsedMs >= timeoutMs ? { kind: "timedOut" } : { kind: "polling" };
}

const PENDING_CHECKOUT_RETURN_KEY = "baas_checkout_return_to";

/**
 * Stashes where the browser should land once a checkout session resolves —
 * e.g. back on the farm page the customer started from, so they see their
 * plot marked "Requested" rather than a generic confirmation screen. This
 * has to be sessionStorage, not React Router `state`: our checkout page
 * keeps the customer on our own form while they enter payment details, but
 * confirming it triggers a real top-level browser navigation to return_url
 * — a fresh page load, which drops any in-memory router state.
 * Called from plot-crops-and-rent.tsx right before navigating to checkout;
 * read back (once) by payment-return.tsx via consumeCheckoutReturnTo.
 */
export function rememberCheckoutReturnTo(returnTo: string): void {
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_RETURN_KEY, returnTo);
  } catch {
    // Ignore storage errors (e.g. privacy mode) — consumeCheckoutReturnTo's
    // caller falls back to a sane default when nothing was stored.
  }
}

/** Reads and clears the stashed return destination — one-shot, since it only ever applies to the single checkout attempt that set it. */
export function consumeCheckoutReturnTo(): string | null {
  try {
    const value = sessionStorage.getItem(PENDING_CHECKOUT_RETURN_KEY);
    sessionStorage.removeItem(PENDING_CHECKOUT_RETURN_KEY);
    return value;
  } catch {
    return null;
  }
}
