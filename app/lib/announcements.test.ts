import { describe, expect, it } from "vitest";
import { recentAnnouncementCount, type Announcement } from "./announcements";

function announcement(createdAt: string): Announcement {
  return { id: createdAt, farmer: "f", farmName: "Hof", subject: "", body: "", createdAt };
}

describe("recentAnnouncementCount", () => {
  const now = new Date("2026-07-08T12:00:00Z");

  it("counts announcements within the last 7 days", () => {
    const list = [
      announcement("2026-07-08T08:00:00Z"),
      announcement("2026-07-02T08:00:00Z"),
      announcement("2026-06-30T08:00:00Z"),
    ];
    expect(recentAnnouncementCount(list, now)).toBe(2);
  });

  it("honours a custom window", () => {
    expect(recentAnnouncementCount([announcement("2026-07-06T08:00:00Z")], now, 1)).toBe(0);
  });

  it("returns 0 for an empty board", () => {
    expect(recentAnnouncementCount([], now)).toBe(0);
  });
});
