"use server";

import { createClient } from "@/lib/supabase/server";
import { formatDateSG } from "@/lib/utils";
import { detectIllness, type IllnessSignal } from "@/lib/readiness/illness";
import type { ReadinessScore } from "@/types";

export interface ReadinessStatus {
  readiness: ReadinessScore | null;
  /** Newest daily_metrics date, for the staleness nudge */
  latestMetricsDate: string | null;
  /** Days between today (SGT) and the readiness score's date */
  staleDays: number | null;
  /** Illness red-flag on the most recent day, if any */
  illness: IllnessSignal | null;
}

export async function getLatestReadiness(): Promise<ReadinessStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      readiness: null,
      latestMetricsDate: null,
      staleDays: null,
      illness: null,
    };

  const [{ data: scores }, { data: metrics }] = await Promise.all([
    supabase
      .from("readiness_scores")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1),
    // Enough recent history for a 30-day RHR baseline + the flag check.
    supabase
      .from("daily_metrics")
      .select("date, resting_hr, skin_temp_deviation")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(45),
  ]);

  const readiness = (scores?.[0] as ReadinessScore | undefined) ?? null;
  const metricRows = (metrics ?? []) as {
    date: string;
    resting_hr: number | null;
    skin_temp_deviation: number | null;
  }[];
  const latestMetricsDate = metricRows[0]?.date ?? null;

  let staleDays: number | null = null;
  if (readiness) {
    const today = new Date(`${formatDateSG()}T00:00:00Z`).getTime();
    const scoreDay = new Date(`${readiness.date}T00:00:00Z`).getTime();
    staleDays = Math.max(0, Math.round((today - scoreDay) / 86_400_000));
  }

  // detectIllness expects ascending history.
  const illness = detectIllness([...metricRows].reverse());

  return { readiness, latestMetricsDate, staleDays, illness };
}
