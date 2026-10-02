import { apiClient, ApiError } from "~/lib/api-client";

/**
 * Farmer subscription API wrappers. See
 * backend/internal/handlers/subscription_handler.go for the authoritative
 * contract:
 *
 *   GET  /api/subscriptions/plans              -> SubscriptionPlan[] (public)
 *   POST /api/subscriptions/checkout-sessions   -> SubscriptionCheckoutSession (farmer only)
 *   GET  /api/subscriptions/me                  -> FarmerSubscription (farmer only) or 404 if never subscribed
 *   PUT  /api/subscriptions/upgrade             -> FarmerSubscription (farmer only)
 *
 * Every farmer must hold an Active or PastDue subscription to use anything
 * under /farmer beyond this flow itself — see farmer/layout.tsx's
 * clientLoader (requireActiveSubscription in ~/lib/guards) for the gate, and
 * routes/farmer/subscribe*.tsx for the picker/checkout/return pages. This is
 * a separate Stripe *subscription*-mode Checkout, independent of the
 * one-time rental payment flow in ~/lib/payments.ts — the two share nothing
 * but the Custom Checkout UI pattern.
 */

export type SubscriptionPlanCode = "cheap" | "modest" | "expensive";

export type SubscriptionPlan = {
  id: string;
  code: SubscriptionPlanCode;
  displayName: string;
  /** null means unlimited (the top tier). */
  maxPlots: number | null;
  priceCents: number;
  isActive: boolean;
};

/** The plans currently open to new subscriptions, cheapest first. Public — no auth required. */
export function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return apiClient.get<SubscriptionPlan[]>("/subscriptions/plans");
}

export type SubscriptionCheckoutSession = {
  clientSecret: string;
  planCode: SubscriptionPlanCode;
  priceCents: number;
};

/**
 * Starts a Stripe subscription Checkout session for `planId`. Throws
 * ApiError(409, "you already have a subscription") if the caller already
 * has one (any non-canceled status), or ApiError(404) if the plan doesn't
 * exist or was retired.
 */
export function createSubscriptionCheckoutSession(planId: string): Promise<SubscriptionCheckoutSession> {
  return apiClient.post<SubscriptionCheckoutSession>("/subscriptions/checkout-sessions", { planId });
}

export type SubscriptionStatus = "pending" | "active" | "past_due" | "canceled";

export type FarmerSubscription = {
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
  planId: string;
  planCode: SubscriptionPlanCode;
  planDisplayName: string;
  priceCents: number;
};

/**
 * The caller's own current subscription, including one still pending
 * checkout. Callers should catch ApiError(404) themselves — it means the
 * farmer has never started a subscription, which is the expected state for
 * a brand-new farmer, not an error to surface.
 */
export function getSubscriptionStatus(): Promise<FarmerSubscription> {
  return apiClient.get<FarmerSubscription>("/subscriptions/me");
}

/** Resolves a possibly-404'd subscription lookup to null instead of throwing. */
export async function getSubscriptionStatusOrNull(): Promise<FarmerSubscription | null> {
  try {
    return await getSubscriptionStatus();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Active or PastDue both count as "may use the farmer dashboard" — see RequireActiveSubscription on the backend. */
export function hasActiveSubscription(sub: FarmerSubscription | null): boolean {
  return sub?.status === "active" || sub?.status === "past_due";
}

/**
 * Moves the caller's subscription to a higher-priced plan, prorating the
 * difference immediately. Throws ApiError(404) if the caller has no
 * active/past_due subscription or planId doesn't exist/is retired, or
 * ApiError(409) if planId isn't priced higher than the caller's current
 * plan.
 */
export function upgradeSubscription(planId: string): Promise<FarmerSubscription> {
  return apiClient.put<FarmerSubscription>("/subscriptions/upgrade", { planId });
}

export type SubscriptionPollOutcome = { kind: "polling" } | { kind: "timedOut" } | { kind: "settled"; status: SubscriptionStatus };

/**
 * Decides what subscribe-return.tsx's poll loop should do next, mirroring
 * payments.ts's decidePollOutcome but against the subscription lifecycle's
 * own terminal-from-the-farmer's-perspective status ("active", not
 * "completed" — a subscription has no equivalent of a one-time payment's
 * "completed" checkout, it just becomes active and stays that way).
 */
export function decideSubscriptionPollOutcome(status: SubscriptionStatus, elapsedMs: number, timeoutMs: number): SubscriptionPollOutcome {
  if (status !== "pending") return { kind: "settled", status };
  return elapsedMs >= timeoutMs ? { kind: "timedOut" } : { kind: "polling" };
}
