import { describe, expect, it } from "vitest";
import { detectIllness, type IllnessInput } from "../illness";
import { addDaysIso } from "../baseline";

function baseHistory(): IllnessInput[] {
  const history: IllnessInput[] = [];
  for (let i = 0; i < 20; i++) {
    history.push({
      date: addDaysIso("2026-01-01", i),
      resting_hr: 58,
      skin_temp_deviation: 0.1,
    });
  }
  return history;
}

describe("detectIllness", () => {
  it("flags a day with high temp AND elevated RHR vs baseline", () => {
    const history = baseHistory();
    history.push({
      date: "2026-01-21",
      resting_hr: 68, // +10 over 58 baseline
      skin_temp_deviation: 1.4,
    });
    const signal = detectIllness(history)!;
    expect(signal).not.toBeNull();
    expect(signal.date).toBe("2026-01-21");
    expect(signal.rhrDelta).toBe(10);
    expect(signal.baselineRestingHr).toBe(58);
  });

  it("does not flag temp alone", () => {
    const history = baseHistory();
    history.push({
      date: "2026-01-21",
      resting_hr: 59, // only +1
      skin_temp_deviation: 1.4,
    });
    expect(detectIllness(history)).toBeNull();
  });

  it("does not flag RHR alone", () => {
    const history = baseHistory();
    history.push({
      date: "2026-01-21",
      resting_hr: 70,
      skin_temp_deviation: 0.3, // below threshold
    });
    expect(detectIllness(history)).toBeNull();
  });

  it("returns null without enough baseline history", () => {
    const history: IllnessInput[] = [
      { date: "2026-01-01", resting_hr: 58, skin_temp_deviation: 0.1 },
      { date: "2026-01-02", resting_hr: 70, skin_temp_deviation: 1.5 },
    ];
    expect(detectIllness(history)).toBeNull();
  });
});
