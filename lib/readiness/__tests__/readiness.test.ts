import { describe, expect, it } from "vitest";
import { computeReadiness, deriveSleepScore, verdictFor } from "../score";
import { addDaysIso, rollingBaseline } from "../baseline";
import { computeReadinessRows, type MetricsForReadiness } from "../backfill";

const fullInput = {
  sleepScore: 85,
  restingHr: 56,
  hrvRmssd: 44,
  yesterdayAzm: 20,
  baselineRestingHr: 58,
  baselineHrvRmssd: 42,
  baselineAzm7d: 25,
};

describe("computeReadiness", () => {
  it("scores a well-recovered day green with all components", () => {
    const result = computeReadiness(fullInput)!;
    expect(result.verdict).toBe("green");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(Object.keys(result.components).sort()).toEqual([
      "hrv",
      "load",
      "rhr",
      "sleep",
    ]);
    // Reweighted maxes always sum to ~100
    const maxSum = Object.values(result.components).reduce(
      (s, c) => s + c.max,
      0
    );
    expect(maxSum).toBeGreaterThanOrEqual(99);
    expect(maxSum).toBeLessThanOrEqual(101);
  });

  it("reweights proportionally when HRV is missing", () => {
    const result = computeReadiness({
      ...fullInput,
      hrvRmssd: null,
    })!;
    expect(result.components.hrv).toBeUndefined();
    // sleep 40/75, rhr 25/75, load 10/75 → max ≈ 53/33/13
    expect(result.components.sleep.max).toBe(53);
    expect(result.components.rhr.max).toBe(33);
    expect(result.components.load.max).toBe(13);
  });

  it("scores a rough night amber or red", () => {
    const result = computeReadiness({
      sleepScore: 55,
      restingHr: 63, // +5 over baseline → zero RHR points
      hrvRmssd: 30, // ~71% of baseline → zero HRV points
      yesterdayAzm: 50, // 2× the weekly average → zero load points
      baselineRestingHr: 58,
      baselineHrvRmssd: 42,
      baselineAzm7d: 25,
    })!;
    expect(result.verdict).toBe("red");
  });

  it("requires sleep and RHR at minimum", () => {
    expect(computeReadiness({ ...fullInput, sleepScore: null })).toBeNull();
    expect(computeReadiness({ ...fullInput, restingHr: null })).toBeNull();
    expect(
      computeReadiness({ ...fullInput, baselineRestingHr: null })
    ).toBeNull();
  });

  it("maps scores onto verdict cutoffs", () => {
    expect(verdictFor(80)).toBe("green");
    expect(verdictFor(79)).toBe("amber");
    expect(verdictFor(55)).toBe("amber");
    expect(verdictFor(54)).toBe("red");
  });
});

describe("deriveSleepScore", () => {
  it("derives from duration + efficiency when the score file is absent", () => {
    expect(deriveSleepScore(480, 92)).toBe(96);
    expect(deriveSleepScore(240, 80)).toBe(65);
    expect(deriveSleepScore(null, 90)).toBeNull();
  });
});

describe("rollingBaseline", () => {
  it("excludes the day itself and enforces the minimum-points rule", () => {
    const byDate = new Map<string, number>();
    for (let i = 1; i <= 20; i++) {
      byDate.set(addDaysIso("2026-02-01", -i), 58);
    }
    byDate.set("2026-02-01", 90); // today's value must not pollute
    expect(rollingBaseline(byDate, "2026-02-01", 30, 14)).toBe(58);
    expect(rollingBaseline(byDate, "2026-02-01", 30, 21)).toBeNull();
  });
});

describe("computeReadinessRows", () => {
  it("skips early days without baselines, then scores with a snapshot", () => {
    const metrics: MetricsForReadiness[] = [];
    for (let i = 0; i < 40; i++) {
      metrics.push({
        date: addDaysIso("2026-01-01", i),
        sleep_score: 80,
        sleep_minutes: 420,
        sleep_efficiency: 92,
        resting_hr: 58,
        hrv_rmssd: 42,
        azm_total: 25,
      });
    }
    const rows = computeReadinessRows(metrics);
    // Needs 14 prior days of RHR → first scoreable day is index 14.
    expect(rows[0].date).toBe("2026-01-15");
    expect(rows.length).toBe(40 - 14);
    expect(rows[0].baseline_snapshot.resting_hr).toBe(58);
    expect(rows[0].baseline_snapshot.hrv_rmssd).toBe(42);
    expect(rows[0].verdict).toBe("green");
  });

  it("still scores when HRV is entirely absent (degraded formula)", () => {
    const metrics: MetricsForReadiness[] = [];
    for (let i = 0; i < 20; i++) {
      metrics.push({
        date: addDaysIso("2026-01-01", i),
        sleep_score: null, // falls back to derived score
        sleep_minutes: 420,
        sleep_efficiency: 90,
        resting_hr: 58,
        hrv_rmssd: null,
        azm_total: null,
      });
    }
    const rows = computeReadinessRows(metrics);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].components.hrv).toBeUndefined();
    expect(rows[0].components.load).toBeUndefined();
  });
});
