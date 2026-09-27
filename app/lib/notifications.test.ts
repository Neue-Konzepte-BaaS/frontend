import { describe, expect, it } from "vitest";
import { kindFromResponse } from "./notifications";

describe("kindFromResponse", () => {
  it("maps the backend's ripeness_notice kind to ripeness", () => {
    expect(kindFromResponse("ripeness_notice")).toBe("ripeness");
  });

  it("keeps care as care", () => {
    expect(kindFromResponse("care")).toBe("care");
  });

  it("files broadcasts and announcements under farm", () => {
    expect(kindFromResponse("broadcast")).toBe("farm");
    expect(kindFromResponse("announcement")).toBe("farm");
  });
});
