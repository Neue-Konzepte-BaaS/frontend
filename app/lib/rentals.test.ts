import { describe, expect, it } from "vitest";
import { earliestPendingRequest, groupPlotsByFarm, nextHandover, type NearbyPlot, type Rental } from "./rentals";

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

function rental(overrides: Partial<Rental>): Rental {
  return {
    id: "r",
    plotId: "p",
    cropId: "c",
    startAt: "2026-04-01T00:00:00Z",
    endAt: "2026-10-31T00:00:00Z",
    status: "approved",
    message: "",
    decidedAt: null,
    ...overrides,
  };
}

describe("earliestPendingRequest", () => {
  it("returns the requested rental that starts soonest, ignoring decided ones", () => {
    const rentals = [
      rental({ id: "late", status: "requested", startAt: "2026-06-01T00:00:00Z" }),
      rental({ id: "soon", status: "requested", startAt: "2026-05-01T00:00:00Z" }),
      rental({ id: "done", status: "approved", startAt: "2026-01-01T00:00:00Z" }),
    ];
    expect(earliestPendingRequest(rentals)?.id).toBe("soon");
  });

  it("returns null when nothing is pending", () => {
    expect(earliestPendingRequest([rental({ status: "declined" })])).toBeNull();
  });
});

describe("nextHandover", () => {
  const now = new Date("2026-07-01T12:00:00Z");

  it("returns the soonest end among approved rentals running now", () => {
    const rentals = [
      rental({ id: "a", endAt: "2026-10-31T00:00:00Z" }),
      rental({ id: "b", endAt: "2026-09-15T00:00:00Z" }),
    ];
    expect(nextHandover(rentals, now)?.toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });

  it("ignores requested, ended and not-yet-started rentals", () => {
    const rentals = [
      rental({ status: "requested" }),
      rental({ endAt: "2026-06-01T00:00:00Z" }),
      rental({ startAt: "2026-08-01T00:00:00Z" }),
    ];
    expect(nextHandover(rentals, now)).toBeNull();
  });
});
