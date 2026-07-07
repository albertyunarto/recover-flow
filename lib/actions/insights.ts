"use server";

import { createClient } from "@/lib/supabase/server";
import { buildInsights, type Insight } from "@/lib/correlation";
import type { DailyMetrics, PainEntry } from "@/types";

export interface CorrelationOverlayPoint {
  date: string;
  pain: number | null;
  sleep_score: number | null;
  resting_hr: number | null;
  azm_total: number | null;
  stress_score: number | null;
}

export interface InsightsData {
  insights: Insight[];
  overlay: CorrelationOverlayPoint[];
  metricsDays: number;
  painDays: number;
}

/**
 * Load daily_metrics + pain_entries and derive correlation insights. The
 * overlay series pairs each day's mean total pain with the day's metrics for
 * the chart; insights come from lib/correlation (pure, tested).
 */
export async function getInsights(): Promise<InsightsData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { insights: [], overlay: [], metricsDays: 0, painDays: 0 };
  }

  const [{ data: metrics }, { data: pain }] = await Promise.all([
    supabase
      .from("daily_metrics")
      .select(
        "date, sleep_score, resting_hr, azm_total, stress_score"
      )
      .eq("user_id", user.id)
      .order("date", { ascending: true }),
    supabase
      .from("pain_entries")
      .select("date, neck_score, back_score, elbow_score, knee_score")
      .eq("user_id", user.id)
      .order("date", { ascending: true }),
  ]);

  const metricRows = (metrics ?? []) as Pick<
    DailyMetrics,
    "date" | "sleep_score" | "resting_hr" | "azm_total" | "stress_score"
  >[];
  const painRows = (pain ?? []) as Pick<
    PainEntry,
    "date" | "neck_score" | "back_score" | "elbow_score" | "knee_score"
  >[];

  const insights = buildInsights(metricRows, painRows);

  // Overlay: mean total pain per day joined with that day's metrics.
  const painByDate = new Map<string, { sum: number; n: number }>();
  for (const p of painRows) {
    const scores = [
      p.neck_score,
      p.back_score,
      p.elbow_score,
      p.knee_score,
    ].filter((s): s is number => s !== null && s !== undefined);
    if (scores.length === 0) continue;
    const acc = painByDate.get(p.date) ?? { sum: 0, n: 0 };
    acc.sum += scores.reduce((a, b) => a + b, 0) / scores.length;
    acc.n += 1;
    painByDate.set(p.date, acc);
  }

  const metricByDate = new Map(metricRows.map((m) => [m.date, m]));
  const allDates = new Set<string>([
    ...metricRows.map((m) => m.date),
    ...painByDate.keys(),
  ]);
  const overlay: CorrelationOverlayPoint[] = [...allDates]
    .sort()
    .map((date) => {
      const m = metricByDate.get(date);
      const painAcc = painByDate.get(date);
      return {
        date,
        pain: painAcc ? Math.round((painAcc.sum / painAcc.n) * 10) / 10 : null,
        sleep_score: m?.sleep_score ?? null,
        resting_hr: m?.resting_hr ?? null,
        azm_total: m?.azm_total ?? null,
        stress_score: m?.stress_score ?? null,
      };
    });

  return {
    insights,
    overlay,
    metricsDays: metricRows.length,
    painDays: painByDate.size,
  };
}
