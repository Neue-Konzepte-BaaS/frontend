import { describe, expect, it } from "vitest";
import { resolveCropRatesToSave, type Crop, type FarmCropRate } from "./fields";

function crop(overrides: Partial<Crop>): Crop {
  return { id: "crop-1", name: "Wheat", durationMonths: 3, ...overrides };
}

describe("resolveCropRatesToSave", () => {
  it("keeps a crop's existing rate when its input was left blank", () => {
    // The bug this guards against: settings.tsx submits a full-replace PUT,
    // so naively dropping blank inputs would silently delete this crop's
    // rate just because the farmer didn't retype it.
    const catalog = [crop({ id: "wheat", name: "Wheat" })];
    const existing: FarmCropRate[] = [{ cropId: "wheat", priceCentsPerSqmPerWeek: 5 }];
    const rateInputs = new Map<string, string>(); // never touched -- still blank

    const result = resolveCropRatesToSave(catalog, rateInputs, existing);

    expect(result).toEqual({ ok: true, rates: [{ cropId: "wheat", priceCentsPerSqmPerWeek: 5 }] });
  });

  it("omits a crop that was never priced and is still blank", () => {
    const catalog = [crop({ id: "carrot", name: "Carrot" })];
    const result = resolveCropRatesToSave(catalog, new Map(), []);

    expect(result).toEqual({ ok: true, rates: [] });
  });

  it("uses the newly typed value for a crop the farmer actually edited", () => {
    const catalog = [crop({ id: "wheat" })];
    const existing: FarmCropRate[] = [{ cropId: "wheat", priceCentsPerSqmPerWeek: 5 }];
    const rateInputs = new Map([["wheat", "0.08"]]);

    const result = resolveCropRatesToSave(catalog, rateInputs, existing);

    expect(result).toEqual({ ok: true, rates: [{ cropId: "wheat", priceCentsPerSqmPerWeek: 8 }] });
  });

  it("only touches the edited crop, leaving every other crop's existing rate intact", () => {
    const catalog = [crop({ id: "wheat", name: "Wheat" }), crop({ id: "carrot", name: "Carrot" }), crop({ id: "potato", name: "Potato" })];
    const existing: FarmCropRate[] = [
      { cropId: "wheat", priceCentsPerSqmPerWeek: 5 },
      { cropId: "carrot", priceCentsPerSqmPerWeek: 3 },
      // potato was never priced.
    ];
    // Only wheat's input is populated (as settings.tsx would after editing
    // just that one field) -- carrot and potato are blank.
    const rateInputs = new Map([["wheat", "0.10"]]);

    const result = resolveCropRatesToSave(catalog, rateInputs, existing);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rates).toEqual(
        expect.arrayContaining([
          { cropId: "wheat", priceCentsPerSqmPerWeek: 10 },
          { cropId: "carrot", priceCentsPerSqmPerWeek: 3 },
        ]),
      );
      expect(result.rates).toHaveLength(2); // potato stays omitted -- it was never priced.
    }
  });

  it("rejects a zero or negative rate, naming the offending crop", () => {
    const catalog = [crop({ id: "wheat", name: "Wheat" })];
    const result = resolveCropRatesToSave(catalog, new Map([["wheat", "0"]]), []);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.invalidCrop.name).toBe("Wheat");
  });

  it("rejects a non-numeric rate", () => {
    const catalog = [crop({ id: "wheat" })];
    const result = resolveCropRatesToSave(catalog, new Map([["wheat", "not-a-number"]]), []);

    expect(result.ok).toBe(false);
  });

  it("treats whitespace-only input the same as blank", () => {
    const catalog = [crop({ id: "wheat" })];
    const existing: FarmCropRate[] = [{ cropId: "wheat", priceCentsPerSqmPerWeek: 5 }];

    const result = resolveCropRatesToSave(catalog, new Map([["wheat", "   "]]), existing);

    expect(result).toEqual({ ok: true, rates: [{ cropId: "wheat", priceCentsPerSqmPerWeek: 5 }] });
  });

  it("returns an empty list for an empty catalog", () => {
    expect(resolveCropRatesToSave([], new Map(), [])).toEqual({ ok: true, rates: [] });
  });
});
