import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "~/lib/api-client";
import {
  classifyCheckoutSessionError,
  consumeCheckoutReturnTo,
  decidePollOutcome,
  rememberCheckoutReturnTo,
} from "./payments";

/**
 * vitest.config.ts runs app/lib tests under the plain "node" environment on
 * purpose (no DOM, no react-router dev plugin — see its own comment), so
 * there's no real `sessionStorage` global here. rememberCheckoutReturnTo /
 * consumeCheckoutReturnTo only ever touch three Storage methods, so a tiny
 * in-memory stand-in is enough — not worth pulling in jsdom for.
 */
function installFakeSessionStorage(overrides: Partial<Pick<Storage, "getItem" | "setItem">> = {}) {
  const store = new Map<string, string>();
  const fake: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    ...overrides,
  };
  vi.stubGlobal("sessionStorage", fake);
}

describe("rememberCheckoutReturnTo / consumeCheckoutReturnTo", () => {
  beforeEach(() => {
    installFakeSessionStorage();
  });

  it("round-trips the stashed destination", () => {
    rememberCheckoutReturnTo("/search/farms/farm-1");
    expect(consumeCheckoutReturnTo()).toBe("/search/farms/farm-1");
  });

  it("is one-shot -- a second read after consuming returns null", () => {
    rememberCheckoutReturnTo("/search/farms/farm-1");
    consumeCheckoutReturnTo();
    expect(consumeCheckoutReturnTo()).toBeNull();
  });

  it("returns null when nothing was ever stashed", () => {
    expect(consumeCheckoutReturnTo()).toBeNull();
  });

  it("consumeCheckoutReturnTo falls back to null if sessionStorage throws (e.g. privacy mode)", () => {
    installFakeSessionStorage({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(consumeCheckoutReturnTo()).toBeNull();
  });

  it("rememberCheckoutReturnTo silently ignores a sessionStorage write failure", () => {
    installFakeSessionStorage({
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => rememberCheckoutReturnTo("/search")).not.toThrow();
  });
});

describe("classifyCheckoutSessionError", () => {
  it("classifies an overlapping-booking 409 as a plot conflict", () => {
    const err = new ApiError(409, "plot is already requested or rented for that period");
    expect(classifyCheckoutSessionError(err)).toEqual({ kind: "plotConflict", message: err.message });
  });

  it("classifies the exact 'crop is not offered' 409 distinctly from a plot conflict", () => {
    const err = new ApiError(409, "crop is not offered by this plot");
    expect(classifyCheckoutSessionError(err)).toEqual({ kind: "cropNotOffered", message: err.message });
  });

  it("does not misclassify an unrelated 409 as either expected conflict", () => {
    const err = new ApiError(409, "something else entirely");
    expect(classifyCheckoutSessionError(err)).toEqual({ kind: "other", message: err.message });
  });

  it("classifies a 400 as an invalid request", () => {
    const err = new ApiError(400, "start date must be 1 to 60 days from now");
    expect(classifyCheckoutSessionError(err)).toEqual({ kind: "invalidRequest", message: err.message });
  });

  it("classifies a 404 (or any other ApiError) as 'other', carrying its message through", () => {
    const err = new ApiError(404, "plot or crop not found");
    expect(classifyCheckoutSessionError(err)).toEqual({ kind: "other", message: "plot or crop not found" });
  });

  it("classifies a non-ApiError (e.g. a network failure) as 'other' with no message", () => {
    expect(classifyCheckoutSessionError(new TypeError("Failed to fetch"))).toEqual({ kind: "other", message: "" });
  });
});

describe("decidePollOutcome", () => {
  it("reports 'polling' while the session is still pending and under the timeout", () => {
    expect(decidePollOutcome("pending", 5000, 20_000)).toEqual({ kind: "polling" });
  });

  it("reports 'timedOut' once elapsed time reaches the timeout, even if still pending", () => {
    // Boundary case: exactly at the timeout, not just past it.
    expect(decidePollOutcome("pending", 20_000, 20_000)).toEqual({ kind: "timedOut" });
    expect(decidePollOutcome("pending", 25_000, 20_000)).toEqual({ kind: "timedOut" });
  });

  it("reports 'settled' the instant the status leaves pending, regardless of elapsed time", () => {
    // Even at 0ms elapsed, a non-pending status is final -- no reason to
    // keep polling just because the timeout clock hasn't run out yet.
    expect(decidePollOutcome("completed", 0, 20_000)).toEqual({ kind: "settled", status: "completed" });
    expect(decidePollOutcome("failed", 0, 20_000)).toEqual({ kind: "settled", status: "failed" });
    expect(decidePollOutcome("expired", 0, 20_000)).toEqual({ kind: "settled", status: "expired" });
    expect(decidePollOutcome("refunded", 0, 20_000)).toEqual({ kind: "settled", status: "refunded" });
  });
});
