import { describe, expect, it } from "vitest";
import { plotStatusesByPlot, sortPlotsNaturally } from "./plots";
import type { Rental } from "./rentals";

const NOW = new Date("2026-06-01T00:00:00Z").getTime();

function rental(overrides: Partial<Rental>): Rental {
  return {
    id: "r1",
    plotId: "p1",
    cropId: "c1",
    startAt: "2026-05-01T00:00:00Z",
    endAt: "2026-09-01T00:00:00Z",
    status: "approved",
    message: "",
    decidedAt: null,
    ...overrides,
  };
}

describe("sortPlotsNaturally", () => {
  it("orders numbers numerically, not lexically", () => {
    const names = ["Plot 10", "Plot 2", "Plot 1", "Plot 20", "Plot 3"].map((name) => ({ name, field: "f" }));
    expect(sortPlotsNaturally(names).map((p) => p.name)).toEqual(["Plot 1", "Plot 2", "Plot 3", "Plot 10", "Plot 20"]);
  });

  it("keeps plots of the same field together", () => {
    const plots = [
      { name: "Plot 2", field: "b" },
      { name: "Plot 1", field: "a" },
      { name: "Plot 1", field: "b" },
    ];
    expect(sortPlotsNaturally(plots)).toEqual([
      { name: "Plot 1", field: "a" },
      { name: "Plot 1", field: "b" },
      { name: "Plot 2", field: "b" },
    ]);
  });
});

describe("plotStatusesByPlot", () => {
  it("marks plots without rentals as free", () => {
    expect(plotStatusesByPlot(["p1"], [], NOW).get("p1")).toEqual({ status: "free", rental: null });
  });

  it("treats an approved, not-yet-ended rental as rented — even if it starts later", () => {
    const future = rental({ startAt: "2026-07-01T00:00:00Z" });
    expect(plotStatusesByPlot(["p1"], [future], NOW).get("p1")?.status).toBe("rented");
  });

  it("ignores ended and declined rentals", () => {
    const ended = rental({ endAt: "2026-05-15T00:00:00Z" });
    const declined = rental({ id: "r2", status: "declined" });
    expect(plotStatusesByPlot(["p1"], [ended, declined], NOW).get("p1")?.status).toBe("free");
  });

  it("shows a pending request only when nothing is approved", () => {
    const request = rental({ id: "r2", status: "requested" });
    expect(plotStatusesByPlot(["p1"], [request], NOW).get("p1")?.status).toBe("requested");
    expect(plotStatusesByPlot(["p1"], [request, rental({})], NOW).get("p1")?.status).toBe("rented");
  });

  it("prefers the earliest approved rental", () => {
    const later = rental({ id: "late", startAt: "2026-10-01T00:00:00Z", endAt: "2027-01-01T00:00:00Z" });
    const current = rental({ id: "now" });
    expect(plotStatusesByPlot(["p1"], [later, current], NOW).get("p1")?.rental?.id).toBe("now");
  });

  it("ignores rentals for plots outside the given list", () => {
    expect(plotStatusesByPlot(["p1"], [rental({ plotId: "other" })], NOW).has("other")).toBe(false);
  });
});
