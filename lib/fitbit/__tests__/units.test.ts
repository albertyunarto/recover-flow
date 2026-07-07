import { describe, expect, it } from "vitest";
import { isPlausibleWeightKg, milesToKm, poundsToKg } from "../units";

describe("units", () => {
  it("converts miles to km within ±0.01", () => {
    expect(milesToKm(1)).toBeCloseTo(1.61, 2);
    expect(milesToKm(3.1)).toBeCloseTo(4.99, 2);
    expect(milesToKm(0)).toBe(0);
  });

  it("converts pounds to kg within ±0.1 (PRD acceptance)", () => {
    expect(poundsToKg(185)).toBeCloseTo(83.9, 1);
    expect(poundsToKg(176.37)).toBeCloseTo(80.0, 1);
  });

  it("bounds plausible weights to 30–200 kg", () => {
    expect(isPlausibleWeightKg(83.9)).toBe(true);
    expect(isPlausibleWeightKg(29.9)).toBe(false);
    expect(isPlausibleWeightKg(201)).toBe(false);
    expect(isPlausibleWeightKg(NaN)).toBe(false);
  });
});
