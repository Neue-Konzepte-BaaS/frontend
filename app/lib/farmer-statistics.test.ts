import { describe, expect, it } from "vitest";
import { occupancyByField, rentalsByCrop, requestFunnel, upcomingStarts } from "./farmer-statistics";
import type { FarmRental } from "./rentals";
import type { FieldWithPlots } from "./fields";

function rental(overrides: Partial<FarmRental> = {}): FarmRental {
  return {
    id: "r-1",
    plotId: "plot-1",
    cropId: "crop-1",
    startAt: "2026-01-01T00:00:00Z",
    endAt: "2026-04-01T00:00:00Z",
    status: "approved",
    message: "",
    decidedAt: "2026-01-01T00:00:00Z",
    plot: { id: "plot-1", name: "Plot 1", field: "field-1", coordinates: { type: "Polygon", coordinates: [] }, areaSquareMeters: 100 },
    fieldName: "North field",
    customer: { id: "c-1", email: "a@b.com", firstName: "Ana", lastName: "B" },
    ...overrides,
  };
}

function field(overrides: Partial<FieldWithPlots> = {}): FieldWithPlots {
  return {
    id: "field-1",
    name: "North field",
    farm: "farm-1",
    coordinates: { type: "Polygon", coordinates: [] },
    plots: [],
    ...overrides,
  };
}

describe("requestFunnel", () => {
  it("counts each status independently", () => {
    const rentals = [
      rental({ status: "requested" }),
      rental({ status: "requested" }),
      rental({ status: "approved" }),
      rental({ status: "declined" }),
    ];
    expect(requestFunnel(rentals)).toEqual({ requested: 2, approved: 1, declined: 1 });
  });

  it("handles no rentals", () => {
    expect(requestFunnel([])).toEqual({ requested: 0, approved: 0, declined: 0 });
  });
});

describe("rentalsByCrop", () => {
  const fields = [
    field({
      plots: [
        { id: "plot-1", name: "Plot 1", field: "field-1", coordinates: { type: "Polygon", coordinates: [] }, areaSquareMeters: 100, crops: [{ id: "crop-1", name: "Tomatoes", durationMonths: 3 }] },
      ],
    }),
  ];

  it("groups by crop name, most-rented first", () => {
    const rentals = [
      rental({ cropId: "crop-1" }),
      rental({ cropId: "crop-1" }),
      rental({ cropId: "crop-2" }),
    ];
    // crop-2 has no matching plot, so it falls back to the raw id.
    expect(rentalsByCrop(rentals, fields)).toEqual([
      { cropName: "Tomatoes", count: 2 },
      { cropName: "crop-2", count: 1 },
    ]);
  });

  it("excludes declined rentals — they never occupied a plot", () => {
    const rentals = [rental({ cropId: "crop-1", status: "declined" })];
    expect(rentalsByCrop(rentals, fields)).toEqual([]);
  });

  it("counts still-requested rentals alongside approved ones", () => {
    const rentals = [rental({ cropId: "crop-1", status: "requested" })];
    expect(rentalsByCrop(rentals, fields)).toEqual([{ cropName: "Tomatoes", count: 1 }]);
  });
});

describe("occupancyByField", () => {
  it("counts a plot as rented only when an approved rental covers now", () => {
    const fields = [
      field({
        plots: [
          { id: "plot-1", name: "Plot 1", field: "field-1", coordinates: { type: "Polygon", coordinates: [] }, areaSquareMeters: 100, crops: [] },
          { id: "plot-2", name: "Plot 2", field: "field-1", coordinates: { type: "Polygon", coordinates: [] }, areaSquareMeters: 100, crops: [] },
        ],
      }),
    ];
    const now = new Date("2026-02-01T00:00:00Z");
    const rentals = [
      rental({ plotId: "plot-1", status: "approved", startAt: "2026-01-01T00:00:00Z", endAt: "2026-04-01T00:00:00Z" }),
      rental({ plotId: "plot-2", status: "requested", startAt: "2026-01-01T00:00:00Z", endAt: "2026-04-01T00:00:00Z" }),
    ];
    expect(occupancyByField(fields, rentals, now)).toEqual([{ fieldName: "North field", rented: 1, total: 2 }]);
  });

  it("does not divide by zero for a field with no plots", () => {
    expect(occupancyByField([field({ plots: [] })], [])).toEqual([{ fieldName: "North field", rented: 0, total: 0 }]);
  });

  it("excludes a rental whose period doesn't cover now", () => {
    const fields = [
      field({ plots: [{ id: "plot-1", name: "Plot 1", field: "field-1", coordinates: { type: "Polygon", coordinates: [] }, areaSquareMeters: 100, crops: [] }] }),
    ];
    const now = new Date("2026-05-01T00:00:00Z");
    const rentals = [rental({ plotId: "plot-1", status: "approved", startAt: "2026-01-01T00:00:00Z", endAt: "2026-04-01T00:00:00Z" })];
    expect(occupancyByField(fields, rentals, now)).toEqual([{ fieldName: "North field", rented: 0, total: 1 }]);
  });
});

describe("upcomingStarts", () => {
  it("counts only approved rentals starting after now", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const rentals = [
      rental({ status: "approved", startAt: "2026-02-01T00:00:00Z" }),
      rental({ status: "approved", startAt: "2025-12-01T00:00:00Z" }),
      rental({ status: "requested", startAt: "2026-03-01T00:00:00Z" }),
    ];
    expect(upcomingStarts(rentals, now)).toBe(1);
  });

  it("handles no rentals", () => {
    expect(upcomingStarts([], new Date())).toBe(0);
  });
});
