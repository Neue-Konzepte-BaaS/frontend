import { describe, expect, it } from "vitest";
import { currentSeason, seasonProgress, type Season } from "./seasons";

function season(overrides: Partial<Season>): Season {
  return {
    id: "s",
    farmId: null,
    name: "Season",
    startMonth: 4,
    startDay: 1,
    endMonth: 10,
    endDay: 31,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("seasonProgress", () => {
  it("counts days from the season start, inclusive", () => {
    expect(seasonProgress(season({}), new Date(2026, 3, 1))).toEqual({ day: 1, totalDays: 214 });
    expect(seasonProgress(season({}), new Date(2026, 6, 4))).toEqual({ day: 95, totalDays: 214 });
  });

  it("returns null outside the season", () => {
    expect(seasonProgress(season({}), new Date(2026, 10, 15))).toBeNull();
  });

  it("handles a season wrapping the year boundary", () => {
    const winter = season({ startMonth: 11, startDay: 1, endMonth: 2, endDay: 28 });
    expect(seasonProgress(winter, new Date(2027, 0, 1))).toEqual({ day: 62, totalDays: 120 });
  });
});

describe("currentSeason", () => {
  const now = new Date(2026, 6, 4);

  it("prefers the farm's own season over a default", () => {
    const result = currentSeason([season({ id: "default" }), season({ id: "own", farmId: "f1" })], now);
    expect(result?.season.id).toBe("own");
  });

  it("picks the one ending soonest among equals", () => {
    const result = currentSeason([season({ id: "long" }), season({ id: "short", endMonth: 9 })], now);
    expect(result?.season.id).toBe("short");
  });

  it("returns null when no season is running", () => {
    expect(currentSeason([season({ startMonth: 1, endMonth: 2 })], now)).toBeNull();
  });
});
