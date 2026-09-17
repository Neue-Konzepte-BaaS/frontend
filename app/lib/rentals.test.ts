import { describe, expect, it } from "vitest";
import { groupPlotsByFarm, type NearbyPlot } from "./rentals";

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
