"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  computeReadinessRows,
  type MetricsForReadiness,
} from "@/lib/readiness/backfill";
import type {
  DailyMetricPartial,
  ImportedExerciseRow,
} from "@/lib/fitbit/types";

const METRIC_SOURCE = "fitbit_export";
const CHUNK_SIZE = 500;

const METRIC_FIELDS = [
  "sleep_minutes",
  "sleep_efficiency",
  "sleep_score",
  "deep_min",
  "light_min",
  "rem_min",
  "awake_min",
  "resting_hr",
  "hrv_rmssd",
  "hr_min",
  "hr_avg",
  "azm_total",
  "steps",
  "stress_score",
  "spo2_avg",
  "skin_temp_deviation",
  "weight_kg",
] as const;

export interface ImportResultSummary {
  daysUpserted: number;
  weightsMirrored: number;
  exercisesUpserted: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Persist parsed daily aggregates. Idempotent: rows upsert on
 * (user_id, date, source), and existing non-null values are preserved when a
 * re-import lacks a folder that previously supplied them (a weekly partial
 * export must never null out history).
 */
export async function importFitbitData(payload: {
  partials: DailyMetricPartial[];
  exercises: ImportedExerciseRow[];
}): Promise<{ summary?: ImportResultSummary; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const partials = payload.partials.filter((p) =>
    /^\d{4}-\d{2}-\d{2}$/.test(p.date)
  );
  if (partials.length === 0 && payload.exercises.length === 0) {
    return { error: "Nothing to import" };
  }

  let daysUpserted = 0;
  let weightsMirrored = 0;
  let exercisesUpserted = 0;

  for (const batch of chunk(partials, CHUNK_SIZE)) {
    const dates = batch.map((p) => p.date);

    // Merge with existing rows so absent metrics don't clobber history.
    const { data: existingRows, error: readError } = await supabase
      .from("daily_metrics")
      .select("*")
      .eq("user_id", user.id)
      .eq("source", METRIC_SOURCE)
      .in("date", dates);
    if (readError) return { error: readError.message };

    const existingByDate = new Map(
      (existingRows ?? []).map((r) => [r.date as string, r])
    );

    const rows = batch.map((partial) => {
      const existing = existingByDate.get(partial.date) ?? {};
      const row: Record<string, unknown> = {
        user_id: user.id,
        date: partial.date,
        source: METRIC_SOURCE,
        imported_at: new Date().toISOString(),
      };
      for (const field of METRIC_FIELDS) {
        const incoming = (partial as Record<string, unknown>)[field];
        row[field] =
          incoming ?? (existing as Record<string, unknown>)[field] ?? null;
      }
      return row;
    });

    const { error: upsertError } = await supabase
      .from("daily_metrics")
      .upsert(rows, { onConflict: "user_id,date,source" });
    if (upsertError) return { error: upsertError.message };
    daysUpserted += rows.length;
  }

  // Mirror weights into weight_entries so the existing chart and weekly
  // review keep working. Manual entries always win on date conflict.
  const weightPartials = partials.filter((p) => p.weight_kg != null);
  for (const batch of chunk(weightPartials, CHUNK_SIZE)) {
    const dates = batch.map((p) => p.date);
    const { data: existingWeights, error: weightReadError } = await supabase
      .from("weight_entries")
      .select("id, date, source")
      .eq("user_id", user.id)
      .in("date", dates);
    if (weightReadError) return { error: weightReadError.message };

    const manualDates = new Set(
      (existingWeights ?? [])
        .filter((w) => w.source !== METRIC_SOURCE)
        .map((w) => w.date as string)
    );

    const rows = batch
      .filter((p) => !manualDates.has(p.date))
      .map((p) => ({
        user_id: user.id,
        date: p.date,
        weight_kg: p.weight_kg,
        source: METRIC_SOURCE,
      }));
    if (rows.length === 0) continue;

    const { error: weightUpsertError } = await supabase
      .from("weight_entries")
      .upsert(rows, { onConflict: "user_id,date" });
    if (weightUpsertError) return { error: weightUpsertError.message };
    weightsMirrored += rows.length;
  }

  // Imported exercises upsert on their Fitbit logId. Reconciliation state
  // (confirmed/linked/dismissed) is not in the payload, so re-imports
  // never reset it.
  for (const batch of chunk(payload.exercises, CHUNK_SIZE)) {
    const rows = batch.map((e) => ({
      user_id: user.id,
      source_log_id: e.source_log_id,
      started_at: e.started_at,
      activity_type: e.activity_type,
      duration_min: e.duration_min,
      distance_km: e.distance_km,
      avg_hr: e.avg_hr,
      calories: e.calories,
    }));
    const { error: exerciseError } = await supabase
      .from("imported_exercises")
      .upsert(rows, { onConflict: "user_id,source_log_id" });
    if (exerciseError) return { error: exerciseError.message };
    exercisesUpserted += rows.length;
  }

  // Recompute readiness over the full history: baselines shift whenever
  // history changes, so per-date incremental updates would drift.
  if (daysUpserted > 0) {
    const { data: allMetrics, error: metricsError } = await supabase
      .from("daily_metrics")
      .select(
        "date, sleep_score, sleep_minutes, sleep_efficiency, resting_hr, hrv_rmssd, azm_total"
      )
      .eq("user_id", user.id)
      .eq("source", METRIC_SOURCE)
      .order("date", { ascending: true });
    if (metricsError) return { error: metricsError.message };

    const readinessRows = computeReadinessRows(
      (allMetrics ?? []) as MetricsForReadiness[]
    );
    for (const batch of chunk(readinessRows, CHUNK_SIZE)) {
      const { error: readinessError } = await supabase
        .from("readiness_scores")
        .upsert(
          batch.map((row) => ({ user_id: user.id, ...row })),
          { onConflict: "user_id,date" }
        );
      if (readinessError) return { error: readinessError.message };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/progress");
  revalidatePath("/run");
  revalidatePath("/settings/import");

  return { summary: { daysUpserted, weightsMirrored, exercisesUpserted } };
}
