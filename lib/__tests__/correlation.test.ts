import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  buildInsights,
  dailyPainByRegion,
  pearson,
  spearman,
} from "../correlation";

describe("pearson / spearman", () => {
  it("detects perfect linear correlation", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1);
  });

  it("returns null for constant series", () => {
    expect(pearson([1, 1, 1], [2, 3, 4])).toBeNull();
  });

  it("spearman handles monotonic non-linear data and ties", () => {
    expect(spearman([1, 2, 3, 4], [1, 8, 27, 64])).toBeCloseTo(1);
    expect(spearman([1, 2, 2, 4], [1, 3, 3, 9])).toBeCloseTo(1);
  });
});

describe("dailyPainByRegion", () => {
  it("averages AM and PM entries per day", () => {
    const byRegion = dailyPainByRegion([
      {
        date: "2026-01-01",
        neck_score: 4,
        back_score: null,
        elbow_score: 2,
        knee_score: null,
      },
      {
        date: "2026-01-01",
        neck_score: 6,
        back_score: null,
        elbow_score: null,
        knee_score: null,
      },
    ]);
    expect(byRegion.neck.get("2026-01-01")).toBe(5);
    expect(byRegion.elbow.get("2026-01-01")).toBe(2);
    expect(byRegion.back.has("2026-01-01")).toBe(false);
  });
});

function syntheticData(days: number) {
  // Elbow pain the day AFTER a low sleep score. The sleep sequence is a
  // non-periodic pseudo-random walk so the relationship shows up ONLY at
  // lag 1 (a periodic series would fake an equally strong same-day link).
  let seed = 7;
  const nextSleep = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return 50 + (seed % 41); // 50..90
  };

  const metrics = [];
  const pain = [];
  const sleepScores: number[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysIso("2026-01-01", i);
    const sleepScore = nextSleep();
    sleepScores.push(sleepScore);
    metrics.push({
      date,
      sleep_score: sleepScore,
      resting_hr: 58,
      azm_total: 20,
      stress_score: null,
    });
    const yesterdayLowSleep = i > 0 && sleepScores[i - 1] < 70;
    pain.push({
      date,
      neck_score: 2,
      back_score: null,
      elbow_score: yesterdayLowSleep ? 6 : 2,
      knee_score: null,
    });
  }
  return { metrics, pain };
}

describe("buildInsights", () => {
  it("finds a lagged sleep→elbow insight with n and effect size", () => {
    const { metrics, pain } = syntheticData(30);
    const insights = buildInsights(metrics, pain);
    const elbowSleep = insights.find(
      (i) => i.region === "elbow" && i.metric === "sleep_score"
    )!;
    expect(elbowSleep).toBeDefined();
    expect(elbowSleep.lag).toBe(1);
    expect(elbowSleep.n).toBeGreaterThanOrEqual(14);
    expect(Math.abs(elbowSleep.pearson)).toBeGreaterThanOrEqual(0.3);
    expect(elbowSleep.effectPts).toBeGreaterThan(0);
    expect(elbowSleep.text).toContain("Elbow pain averages");
    expect(elbowSleep.text).toContain(`n=${elbowSleep.n}`);
  });

  it("emits nothing below the n threshold", () => {
    const { metrics, pain } = syntheticData(13);
    expect(buildInsights(metrics, pain)).toHaveLength(0);
  });

  it("emits nothing for uncorrelated regions", () => {
    const { metrics, pain } = syntheticData(30);
    const neck = buildInsights(metrics, pain).filter(
      (i) => i.region === "neck"
    );
    expect(neck).toHaveLength(0); // constant pain → no correlation
  });
});
