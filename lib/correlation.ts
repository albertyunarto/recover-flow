// Pain ↔ recovery correlation. Insights are observations, not conclusions:
// every card carries n and effect size, and nothing renders below the
// significance gates. Pure module — testable without a database.

import type { DailyMetrics, PainEntry, PainRegion } from "@/types";

export const MIN_N = 14;
export const MIN_ABS_R = 0.3;

export const CORRELATION_METRICS = [
  { key: "sleep_score", label: "sleep score", betterHigh: true },
  { key: "resting_hr", label: "resting heart rate", betterHigh: false },
  { key: "azm_total", label: "training load (AZM)", betterHigh: false },
  { key: "stress_score", label: "stress score", betterHigh: true },
] as const;

export type CorrelationMetricKey =
  (typeof CORRELATION_METRICS)[number]["key"];

export const PAIN_REGIONS: PainRegion[] = ["neck", "back", "elbow", "knee"];

export interface Insight {
  region: PainRegion;
  metric: CorrelationMetricKey;
  metricLabel: string;
  lag: 0 | 1 | 2;
  n: number;
  pearson: number;
  spearman: number;
  /** Mean pain difference: low-metric days minus high-metric days (median split) */
  effectPts: number;
  medianSplit: number;
  text: string;
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2) return null;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX === 0 || varY === 0) return null;
  return cov / Math.sqrt(varX * varY);
}

function ranks(values: number[]): number[] {
  const indexed = values.map((value, i) => ({ value, i }));
  indexed.sort((a, b) => a.value - b.value);
  const out = new Array<number>(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].value === indexed[i].value)
      j++;
    const rank = (i + j) / 2 + 1; // average rank for ties
    for (let k = i; k <= j; k++) out[indexed[k].i] = rank;
    i = j + 1;
  }
  return out;
}

export function spearman(xs: number[], ys: number[]): number | null {
  return pearson(ranks(xs), ranks(ys));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function addDaysIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Daily pain per region: mean of that day's AM/PM scores. */
export function dailyPainByRegion(
  entries: Pick<
    PainEntry,
    "date" | "neck_score" | "back_score" | "elbow_score" | "knee_score"
  >[]
): Record<PainRegion, Map<string, number>> {
  const sums: Record<PainRegion, Map<string, { sum: number; n: number }>> = {
    neck: new Map(),
    back: new Map(),
    elbow: new Map(),
    knee: new Map(),
  };
  for (const entry of entries) {
    for (const region of PAIN_REGIONS) {
      const score = entry[`${region}_score` as const];
      if (score === null || score === undefined) continue;
      const acc = sums[region].get(entry.date) ?? { sum: 0, n: 0 };
      acc.sum += score;
      acc.n += 1;
      sums[region].set(entry.date, acc);
    }
  }
  const out = {} as Record<PainRegion, Map<string, number>>;
  for (const region of PAIN_REGIONS) {
    out[region] = new Map(
      [...sums[region].entries()].map(([date, { sum, n }]) => [date, sum / n])
    );
  }
  return out;
}

const LAG_PHRASE: Record<0 | 1 | 2, string> = {
  0: "on the same day",
  1: "the day after",
  2: "two days after",
};

/**
 * Pain on day d paired with the metric on day d - lag, for every day where
 * both exist.
 */
function laggedPairs(
  metricByDate: Map<string, number>,
  painByDate: Map<string, number>,
  lag: number
): { metric: number; pain: number }[] {
  const pairs: { metric: number; pain: number }[] = [];
  for (const [date, pain] of painByDate) {
    const metric = metricByDate.get(addDaysIso(date, -lag));
    if (metric !== undefined) pairs.push({ metric, pain });
  }
  return pairs;
}

export function buildInsights(
  metrics: Pick<
    DailyMetrics,
    "date" | "sleep_score" | "resting_hr" | "azm_total" | "stress_score"
  >[],
  painEntries: Pick<
    PainEntry,
    "date" | "neck_score" | "back_score" | "elbow_score" | "knee_score"
  >[]
): Insight[] {
  const painByRegion = dailyPainByRegion(painEntries);

  const insights: Insight[] = [];
  for (const metricDef of CORRELATION_METRICS) {
    const metricByDate = new Map<string, number>();
    for (const m of metrics) {
      const value = m[metricDef.key];
      if (value !== null && value !== undefined)
        metricByDate.set(m.date, Number(value));
    }
    if (metricByDate.size === 0) continue;

    for (const region of PAIN_REGIONS) {
      const painByDate = painByRegion[region];
      if (painByDate.size === 0) continue;

      let best: Insight | null = null;
      for (const lag of [0, 1, 2] as const) {
        const pairs = laggedPairs(metricByDate, painByDate, lag);
        if (pairs.length < MIN_N) continue;
        const xs = pairs.map((p) => p.metric);
        const ys = pairs.map((p) => p.pain);
        const r = pearson(xs, ys);
        const rho = spearman(xs, ys);
        if (r === null || rho === null || Math.abs(r) < MIN_ABS_R) continue;

        // Median split for the plain-language effect size.
        const split = median(xs);
        const low = pairs.filter((p) => p.metric < split).map((p) => p.pain);
        const high = pairs.filter((p) => p.metric >= split).map((p) => p.pain);
        if (low.length === 0 || high.length === 0) continue;
        const meanLow = low.reduce((a, b) => a + b, 0) / low.length;
        const meanHigh = high.reduce((a, b) => a + b, 0) / high.length;
        const effectPts = Math.round((meanLow - meanHigh) * 10) / 10;

        const candidate: Insight = {
          region,
          metric: metricDef.key,
          metricLabel: metricDef.label,
          lag,
          n: pairs.length,
          pearson: Math.round(r * 100) / 100,
          spearman: Math.round(rho * 100) / 100,
          effectPts,
          medianSplit: Math.round(split * 10) / 10,
          text: insightText(region, metricDef.label, lag, effectPts, split, pairs.length),
        };
        if (!best || Math.abs(candidate.pearson) > Math.abs(best.pearson)) {
          best = candidate;
        }
      }
      if (best) insights.push(best);
    }
  }

  return insights.sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson));
}

function insightText(
  region: PainRegion,
  metricLabel: string,
  lag: 0 | 1 | 2,
  effectPts: number,
  split: number,
  n: number
): string {
  const regionLabel = region.charAt(0).toUpperCase() + region.slice(1);
  const splitLabel = Math.round(split * 10) / 10;
  if (effectPts > 0) {
    return `${regionLabel} pain averages ${effectPts.toFixed(1)} pts higher ${LAG_PHRASE[lag]} when ${metricLabel} is below ${splitLabel} (n=${n}).`;
  }
  return `${regionLabel} pain averages ${Math.abs(effectPts).toFixed(1)} pts higher ${LAG_PHRASE[lag]} when ${metricLabel} is ${splitLabel} or above (n=${n}).`;
}
