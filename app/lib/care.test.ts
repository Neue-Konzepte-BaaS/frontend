import { describe, expect, it } from "vitest";
import {
  careGuideForPlot,
  cropStage,
  isoWeek,
  splitInstructionsByWeek,
  type CareInstruction,
  type PlotCareGuide,
} from "./care";

function instruction(week: number, title = `Week ${week}`): CareInstruction {
  return {
    id: `i-${week}-${title}`,
    cropId: "crop-1",
    week,
    title,
    body: "...",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

function guide(overrides: Partial<PlotCareGuide> = {}): PlotCareGuide {
  return {
    rentalId: "rental-1",
    plotId: "plot-1",
    plotName: "Plot 1",
    fieldName: "North field",
    crop: { id: "crop-1", name: "Tomatoes", durationMonths: 3 },
    startAt: "2026-04-01T00:00:00Z",
    endAt: "2026-07-01T00:00:00Z",
    currentWeek: 3,
    totalWeeks: 13,
    instructions: [],
    ...overrides,
  };
}

describe("careGuideForPlot", () => {
  it("finds the guide for the plot being viewed", () => {
    const guides = [guide({ plotId: "plot-1" }), guide({ plotId: "plot-2", plotName: "Plot 2" })];
    expect(careGuideForPlot(guides, "plot-2")?.plotName).toBe("Plot 2");
  });

  it("returns undefined for a plot with no running rental", () => {
    // The endpoint only carries active rentals, so an expired one is simply absent.
    expect(careGuideForPlot([guide()], "plot-9")).toBeUndefined();
  });
});

describe("splitInstructionsByWeek", () => {
  const instructions = [instruction(1), instruction(3), instruction(3, "Also week 3"), instruction(5)];

  it("puts the current week's tasks in thisWeek", () => {
    const { thisWeek } = splitInstructionsByWeek(instructions, 3);
    expect(thisWeek.map((i) => i.title)).toEqual(["Week 3", "Also week 3"]);
  });

  it("keeps only later weeks in upcoming", () => {
    const { upcoming } = splitInstructionsByWeek(instructions, 3);
    expect(upcoming.map((i) => i.week)).toEqual([5]);
  });

  it("drops weeks already behind the tenant", () => {
    const { thisWeek, upcoming } = splitInstructionsByWeek(instructions, 3);
    expect([...thisWeek, ...upcoming].some((i) => i.week < 3)).toBe(false);
  });

  it("handles a crop with no guide yet", () => {
    expect(splitInstructionsByWeek([], 1)).toEqual({ thisWeek: [], upcoming: [] });
  });
});

describe("cropStage", () => {
  const start = "2026-04-01T00:00:00Z";
  const end = "2026-07-01T00:00:00Z";

  it("is upcoming before the rental starts", () => {
    expect(cropStage(start, end, new Date("2026-03-31T00:00:00Z"))).toBe("upcoming");
  });

  it("is growing in the middle of the period", () => {
    expect(cropStage(start, end, new Date("2026-05-01T00:00:00Z"))).toBe("growing");
  });

  it("is readyToHarvest in the final week", () => {
    expect(cropStage(start, end, new Date("2026-06-28T00:00:00Z"))).toBe("readyToHarvest");
  });

  it("is seasonOver once the end is reached (the end is exclusive)", () => {
    expect(cropStage(start, end, new Date("2026-07-01T00:00:00Z"))).toBe("seasonOver");
  });
});

describe("isoWeek", () => {
  it("counts the week containing the year's first Thursday as week 1", () => {
    // 2026-01-01 is a Thursday, so it is already week 1.
    expect(isoWeek(new Date("2026-01-01T00:00:00Z"))).toBe(1);
  });

  it("puts a January date before that Thursday in the previous year's last week", () => {
    // 2027-01-01 is a Friday, so it belongs to 2026's week 53.
    expect(isoWeek(new Date("2027-01-01T00:00:00Z"))).toBe(53);
  });

  it("matches a known mid-year week", () => {
    expect(isoWeek(new Date("2026-07-01T00:00:00Z"))).toBe(27);
  });
});
