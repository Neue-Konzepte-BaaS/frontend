import { describe, expect, it } from "vitest";
import { fromResponse, kindFromResponse, ripeToday, type Notification } from "./notifications";

describe("kindFromResponse", () => {
  it("maps the backend's ripeness_notice kind to ripeness", () => {
    expect(kindFromResponse("ripeness_notice")).toBe("ripeness");
  });

  it("keeps care as care", () => {
    expect(kindFromResponse("care")).toBe("care");
  });

  it("files broadcasts under farm", () => {
    expect(kindFromResponse("broadcast")).toBe("farm");
  });

  it("maps announcement to announcement", () => {
    expect(kindFromResponse("announcement")).toBe("announcement");
  });
});

describe("fromResponse", () => {
  it("maps a ripeness notice's plot_name to plotName, leaving fieldName unset", () => {
    const result = fromResponse({
      id: "n1",
      kind: "ripeness_notice",
      subject: "Zucchini ist reif",
      body: "Zucchini auf Parzelle 3 ist bereit zur Ernte.",
      farm_name: "Hof Berger",
      plot_name: "Parzelle 3",
      crop_name: "Zucchini",
      created_at: "2026-07-01T07:10:00",
    });
    expect(result.plotName).toBe("Parzelle 3");
    expect(result.fieldName).toBeUndefined();
  });

  it("maps a care item's field_name to fieldName, leaving plotName unset", () => {
    const result = fromResponse({
      id: "n2",
      kind: "care",
      subject: "Woche 3: Gießen",
      body: "Zweimal pro Woche",
      field_name: "Feld Nord",
      crop_name: "Zucchini",
      created_at: "2026-07-01T07:10:00",
    });
    expect(result.fieldName).toBe("Feld Nord");
    expect(result.plotName).toBeUndefined();
  });
});

function notification(overrides: Partial<Notification>): Notification {
  return {
    id: "n",
    kind: "ripeness",
    subject: "",
    body: "",
    sender: "Hof Berger",
    createdAt: "2026-07-01T07:10:00",
    ...overrides,
  };
}

describe("ripeToday", () => {
  const now = new Date("2026-07-01T12:00:00");

  it("returns the newest ripeness notice from today", () => {
    const result = ripeToday(
      [
        notification({ id: "early", createdAt: "2026-07-01T06:00:00" }),
        notification({ id: "late", createdAt: "2026-07-01T09:30:00" }),
      ],
      now,
    );
    expect(result?.id).toBe("late");
  });

  it("ignores yesterday's notices and other kinds", () => {
    const result = ripeToday(
      [
        notification({ id: "yesterday", createdAt: "2026-06-30T23:59:00" }),
        notification({ id: "care", kind: "care" }),
        notification({ id: "farm", kind: "farm" }),
      ],
      now,
    );
    expect(result).toBeNull();
  });

  it("returns null for an empty inbox", () => {
    expect(ripeToday([], now)).toBeNull();
  });
});
