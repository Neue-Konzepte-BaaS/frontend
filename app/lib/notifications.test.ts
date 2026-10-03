import { describe, expect, it } from "vitest";
import { kindFromResponse, ripeToday, type Notification } from "./notifications";

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
