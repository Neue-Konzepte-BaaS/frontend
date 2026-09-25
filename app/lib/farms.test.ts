import { describe, expect, it } from "vitest";
import { toFarmUpdate } from "./farms";

const form = { name: " Hof Sonnental ", address: " Feldweg 1 ", description: " Bio seit 1998 ", foundedAt: "1998-04-01" };
const today = "2026-09-25";

describe("toFarmUpdate", () => {
  it("trims every field into the request body", () => {
    expect(toFarmUpdate(form, today)).toEqual({
      update: { name: "Hof Sonnental", address: "Feldweg 1", description: "Bio seit 1998", foundedAt: "1998-04-01" },
    });
  });

  it("sends an empty founding date as null, which clears it", () => {
    expect(toFarmUpdate({ ...form, foundedAt: "" }, today)).toEqual({
      update: { name: "Hof Sonnental", address: "Feldweg 1", description: "Bio seit 1998", foundedAt: null },
    });
  });

  it("requires a name and an address", () => {
    expect(toFarmUpdate({ ...form, name: "   " }, today)).toEqual({ problem: "nameRequired" });
    expect(toFarmUpdate({ ...form, address: "" }, today)).toEqual({ problem: "addressRequired" });
  });

  it("allows today but not a founding date in the future", () => {
    expect(toFarmUpdate({ ...form, foundedAt: today }, today)).toHaveProperty("update");
    expect(toFarmUpdate({ ...form, foundedAt: "2026-09-26" }, today)).toEqual({ problem: "foundedInFuture" });
  });
});
