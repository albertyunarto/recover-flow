import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sleepParser } from "../parsers/sleep";
import { sleepScoreParser } from "../parsers/sleep-score";
import { restingHeartRateParser } from "../parsers/resting-heart-rate";
import { hrvParser } from "../parsers/hrv";
import { weightParser } from "../parsers/weight";
import { stepsParser } from "../parsers/steps";
import { azmParser } from "../parsers/azm";
import { stressParser } from "../parsers/stress";
import { spo2Parser } from "../parsers/spo2";
import { temperatureParser } from "../parsers/temperature";
import { mergeDailyPartials } from "../merge";
import type { FileEntry } from "../types";

function fixture(name: string, asName?: string): FileEntry {
  return {
    name: asName ?? name,
    content: readFileSync(join(__dirname, "../__fixtures__", name), "utf-8"),
  };
}

describe("sleepParser", () => {
  it("merges naps into day totals; main sleep owns efficiency and stages", async () => {
    const result = await sleepParser.parse([fixture("sleep-2026-01-01.json")]);
    const jan1 = result.partials.find((p) => p.date === "2026-01-01")!;
    // 412 main + 40 nap
    expect(jan1.sleep_minutes).toBe(452);
    expect(jan1.awake_min).toBe(48);
    expect(jan1.sleep_efficiency).toBe(92);
    expect(jan1.deep_min).toBe(88);
    expect(jan1.light_min).toBe(230);
    expect(jan1.rem_min).toBe(94);
  });

  it("handles classic sessions without fabricating stage data", async () => {
    const result = await sleepParser.parse([fixture("sleep-2026-01-01.json")]);
    const jan2 = result.partials.find((p) => p.date === "2026-01-02")!;
    expect(jan2.sleep_minutes).toBe(371);
    expect(jan2.sleep_efficiency).toBe(90);
    expect(jan2.deep_min).toBeNull();
    expect(jan2.rem_min).toBeNull();
  });

  it("skips malformed sessions without throwing", async () => {
    const result = await sleepParser.parse([fixture("sleep-2026-01-01.json")]);
    expect(result.rowsParsed).toBe(3);
    expect(result.rowsSkipped).toBe(1);
  });
});

describe("sleepScoreParser", () => {
  it("extracts scores keyed by wake-up day, skipping bad rows", async () => {
    const result = await sleepScoreParser.parse([fixture("sleep_score.csv")]);
    expect(result.partials).toEqual([
      { date: "2026-01-01", sleep_score: 81 },
      { date: "2026-01-02", sleep_score: 74 },
    ]);
    expect(result.rowsSkipped).toBe(2); // bad timestamp + zero score
  });
});

describe("restingHeartRateParser", () => {
  it("rounds values and treats 0 as missing", async () => {
    const result = await restingHeartRateParser.parse([
      fixture("resting_heart_rate-2026-01-01.json"),
    ]);
    expect(result.partials).toEqual([
      { date: "2026-01-01", resting_hr: 58 },
      { date: "2026-01-02", resting_hr: 61 },
    ]);
    expect(result.rowsSkipped).toBe(1);
  });
});

describe("hrvParser", () => {
  it("parses nightly rmssd", async () => {
    const result = await hrvParser.parse([
      fixture(
        "hrv-summary.csv",
        "Daily Heart Rate Variability Summary - 2026-01.csv"
      ),
    ]);
    expect(result.partials).toEqual([
      { date: "2026-01-01", hrv_rmssd: 42.59 },
      { date: "2026-01-02", hrv_rmssd: 38.11 },
    ]);
    expect(result.rowsSkipped).toBe(1);
  });
});

describe("weightParser", () => {
  it("converts pounds to kg, keeps first weigh-in per day, drops implausible values", async () => {
    const result = await weightParser.parse([
      fixture("weight-2026-01-01.json"),
    ]);
    expect(result.partials).toEqual([
      { date: "2026-01-01", weight_kg: 84.0 }, // 185.2 lb
      { date: "2026-01-03", weight_kg: 83.4 }, // 183.9 lb
    ]);
    expect(result.rowsSkipped).toBe(1); // 500 lb → 226.8 kg → out of bounds
  });
});

describe("stepsParser", () => {
  it("sums intraday minutes into daily totals via the streaming interface", async () => {
    stepsParser.parseFile!(fixture("steps-2026-01-01.json"));
    const result = stepsParser.finalize!();
    expect(result.partials).toEqual([
      { date: "2026-01-01", steps: 314 },
      { date: "2026-01-02", steps: 180 },
    ]);
    expect(result.rowsSkipped).toBe(1);
  });

  it("resets state between runs", async () => {
    const result = await stepsParser.parse!([fixture("steps-2026-01-01.json")]);
    expect(result.partials.find((p) => p.date === "2026-01-01")?.steps).toBe(
      314
    );
  });
});

describe("azmParser", () => {
  it("applies zone multipliers (cardio/peak ×2)", async () => {
    const result = await azmParser.parse([
      fixture("azm-2026-01.csv", "2026-01.csv"),
    ]);
    expect(result.partials).toEqual([
      { date: "2026-01-01", azm_total: 6 }, // 1+1 fat burn + 2 cardio + 2 peak
      { date: "2026-01-02", azm_total: 1 },
    ]);
    expect(result.rowsSkipped).toBe(1);
  });
});

describe("stressParser", () => {
  it("skips failed calculations instead of storing zero", async () => {
    const result = await stressParser.parse([
      fixture("stress-score.csv", "Stress Score.csv"),
    ]);
    expect(result.partials).toEqual([
      { date: "2026-01-01", stress_score: 78 },
      { date: "2026-01-03", stress_score: 81 },
    ]);
    expect(result.rowsSkipped).toBe(1);
  });
});

describe("spo2Parser", () => {
  it("parses nightly averages", async () => {
    const result = await spo2Parser.parse([
      fixture("daily-spo2.csv", "Daily SpO2 - 2026-01.csv"),
    ]);
    expect(result.partials).toEqual([
      { date: "2026-01-01", spo2_avg: 95.4 },
      { date: "2026-01-02", spo2_avg: 96.1 },
    ]);
  });
});

describe("temperatureParser", () => {
  it("parses nightly deviation and drops sensor garbage", async () => {
    const result = await temperatureParser.parse([
      fixture(
        "computed-temperature-2026-01.csv",
        "Computed Temperature - 2026-01.csv"
      ),
    ]);
    expect(result.partials).toEqual([
      { date: "2026-01-01", skin_temp_deviation: -0.2 },
      { date: "2026-01-02", skin_temp_deviation: 1.3 },
    ]);
    expect(result.rowsSkipped).toBe(1); // +7.9°C is not physiology
  });
});

describe("mergeDailyPartials", () => {
  it("merges fields from different parsers into one row per date", () => {
    const merged = mergeDailyPartials([
      [{ date: "2026-01-01", sleep_minutes: 452 }],
      [{ date: "2026-01-01", resting_hr: 58 }],
      [{ date: "2026-01-02", steps: 180 }],
    ]);
    expect(merged).toEqual([
      { date: "2026-01-01", sleep_minutes: 452, resting_hr: 58 },
      { date: "2026-01-02", steps: 180 },
    ]);
  });
});
