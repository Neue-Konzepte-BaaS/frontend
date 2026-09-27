import { describe, expect, it } from "vitest";
import { earliestPendingRequest, groupPlotsByFarm, type NearbyPlot, type Rental } from "./rentals";

/** A minimal NearbyPlot — only the fields groupPlotsByFarm reads matter to these tests. */
function plot(overrides: Partial<NearbyPlot>): NearbyPlot {
  return {
    id: "plot-1",
    name: "Plot",
    field: "field-1",
    coordinates: { type: "Polygon", coordinates: [[[0, 0]]] },
    areaSquareMeters: 100,
    distanceMeters: 1000,
    crops: [],
    farm: "farm-1",
    ...overrides,
  };
}

function rental(overrides: Partial<Rental>): Rental {
  return {
    id: "r1",
    plotId: "p1",
    cropId: "c1",
    startAt: "2026-05-01T00:00:00Z",
    endAt: "2026-09-01T00:00:00Z",
    status: "requested",
    message: "",
    decidedAt: null,
    ...overrides,
  };
}

describe("groupPlotsByFarm", () => {
  it("returns one entry per distinct farm", () => {
    const farms = groupPlotsByFarm([plot({ id: "a", farm: "f1" }), plot({ id: "b", farm: "f2" })]);
    expect(farms.map((f) => f.farmId)).toEqual(["f1", "f2"]);
  });

  it("counts every plot belonging to the same farm", () => {
    const farms = groupPlotsByFarm([
      plot({ id: "a", farm: "f1" }),
      plot({ id: "b", farm: "f1" }),
      plot({ id: "c", farm: "f1" }),
    ]);
    expect(farms).toHaveLength(1);
    expect(farms[0].plotCount).toBe(3);
  });

  it("uses the nearest plot's distance for the farm (results arrive nearest-first)", () => {
    const farms = groupPlotsByFarm([
      plot({ id: "a", farm: "f1", distanceMeters: 500 }),
      plot({ id: "b", farm: "f1", distanceMeters: 9000 }),
    ]);
    expect(farms[0].distanceMeters).toBe(500);
  });

  it("returns an empty list for no results", () => {
    expect(groupPlotsByFarm([])).toEqual([]);
  });
});

describe("earliestPendingRequest", () => {
  it("returns null when there are no requested rentals", () => {
    expect(earliestPendingRequest([rental({ status: "approved" }), rental({ id: "r2", status: "declined" })])).toBeNull();
  });

  it("picks the requested rental starting soonest", () => {
    const soonest = rental({ id: "soonest", startAt: "2026-05-10T00:00:00Z" });
    const later = rental({ id: "later", startAt: "2026-06-01T00:00:00Z" });
    expect(earliestPendingRequest([later, soonest])?.id).toBe("soonest");
  });

  it("ignores approved and declined rentals even if they'd start sooner", () => {
    const approved = rental({ id: "approved", status: "approved", startAt: "2026-01-01T00:00:00Z" });
    const requested = rental({ id: "requested", startAt: "2026-06-01T00:00:00Z" });
    expect(earliestPendingRequest([approved, requested])?.id).toBe("requested");
  });
});
