import {
  addDaysIso,
  rollingBaseline,
  BASELINE_MIN_POINTS,
  BASELINE_WINDOW_DAYS,
  LOAD_MIN_POINTS,
  LOAD_WINDOW_DAYS,
} from "./baseline";
import { computeReadiness, deriveSleepScore } from "./score";
import type { ReadinessComponent, ReadinessVerdict } from "@/types";

export interface MetricsForReadiness {
  date: string;
  sleep_score: number | null;
  sleep_minutes: number | null;
  sleep_efficiency: number | null;
  resting_hr: number | null;
  hrv_rmssd: number | null;
  azm_total: number | null;
}

export interface ReadinessRow {
  date: string;
  score: number;
  verdict: ReadinessVerdict;
  components: Record<string, ReadinessComponent>;
  baseline_snapshot: Record<string, number | null>;
}

/**
 * Compute readiness for every day in the metrics history that has enough
 * data. Pure — the caller persists the rows. Baselines are rolling and
 * exclude the day being scored, so re-running over the full history after
 * each import keeps every score consistent with what's now known.
 */
export function computeReadinessRows(
  metrics: MetricsForReadiness[]
): ReadinessRow[] {
  const rhrByDate = new Map<string, number>();
  const hrvByDate = new Map<string, number>();
  const azmByDate = new Map<string, number>();
  for (const m of metrics) {
    if (m.resting_hr !== null) rhrByDate.set(m.date, m.resting_hr);
    if (m.hrv_rmssd !== null) hrvByDate.set(m.date, Number(m.hrv_rmssd));
    if (m.azm_total !== null) azmByDate.set(m.date, m.azm_total);
  }

  const rows: ReadinessRow[] = [];
  for (const m of metrics) {
    const sleepScore =
      m.sleep_score ?? deriveSleepScore(m.sleep_minutes, m.sleep_efficiency);

    const baselineRestingHr = rollingBaseline(
      rhrByDate,
      m.date,
      BASELINE_WINDOW_DAYS,
      BASELINE_MIN_POINTS
    );
    const baselineHrvRmssd = rollingBaseline(
      hrvByDate,
      m.date,
      BASELINE_WINDOW_DAYS,
      BASELINE_MIN_POINTS
    );
    // Load compares yesterday's AZM to the 7 days before it.
    const yesterday = addDaysIso(m.date, -1);
    const baselineAzm7d = rollingBaseline(
      azmByDate,
      yesterday,
      LOAD_WINDOW_DAYS,
      LOAD_MIN_POINTS
    );

    const result = computeReadiness({
      sleepScore,
      restingHr: m.resting_hr,
      hrvRmssd: m.hrv_rmssd !== null ? Number(m.hrv_rmssd) : null,
      yesterdayAzm: azmByDate.get(yesterday) ?? null,
      baselineRestingHr,
      baselineHrvRmssd,
      baselineAzm7d,
    });
    if (!result) continue;

    rows.push({
      date: m.date,
      score: result.score,
      verdict: result.verdict,
      components: result.components,
      baseline_snapshot: {
        resting_hr:
          baselineRestingHr !== null
            ? Math.round(baselineRestingHr * 10) / 10
            : null,
        hrv_rmssd:
          baselineHrvRmssd !== null
            ? Math.round(baselineHrvRmssd * 100) / 100
            : null,
        azm_7d:
          baselineAzm7d !== null ? Math.round(baselineAzm7d * 10) / 10 : null,
      },
    });
  }
  return rows;
}
