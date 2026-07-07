"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import runScheduleData from "@/lib/data/run-schedule.json";
import type { ImportedExercise, RunWeekSchedule } from "@/types";

const RUN_ACTIVITY_TYPES = ["run", "walk", "treadmill", "jog", "hike"];

function plannedMinutes(week: RunWeekSchedule): number | null {
  if (week.total_min) return week.total_min;
  if (week.total_run_min) return week.total_run_min;
  if (week.walk_min && week.run_min && week.cycles) {
    return (week.walk_min + week.run_min) * week.cycles;
  }
  return null;
}

export interface ReconcileCandidate {
  exercise: ImportedExercise;
  /** Plan week this activity plausibly satisfies, if any */
  suggestedWeek: number | null;
  suggestedFormat: string | null;
}

/**
 * Unconfirmed, non-dismissed imported exercises that look like plan runs,
 * with a suggested plan week when the duration is within ±30% of a week's
 * planned session. The user confirms or dismisses; nothing is auto-linked.
 */
export async function getReconcileCandidates(
  currentWeek: number
): Promise<ReconcileCandidate[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("imported_exercises")
    .select("*")
    .eq("user_id", user.id)
    .eq("confirmed", false)
    .eq("dismissed", false)
    .order("started_at", { ascending: false })
    .limit(50);

  const schedule = runScheduleData.schedule as RunWeekSchedule[];
  const currentSchedule = schedule.find((s) => s.week === currentWeek);

  return ((data as ImportedExercise[]) ?? [])
    .filter((e) => RUN_ACTIVITY_TYPES.includes(e.activity_type.toLowerCase()))
    .map((exercise) => {
      let suggestedWeek: number | null = null;
      let suggestedFormat: string | null = null;
      const planned = currentSchedule
        ? plannedMinutes(currentSchedule)
        : null;
      if (
        currentSchedule &&
        planned &&
        exercise.duration_min &&
        exercise.duration_min >= planned * 0.7 &&
        exercise.duration_min <= planned * 1.3
      ) {
        suggestedWeek = currentWeek;
        suggestedFormat =
          currentSchedule.format ??
          `Walk ${currentSchedule.walk_min}min → Run ${currentSchedule.run_min}min × ${currentSchedule.cycles} cycles`;
      }
      return { exercise, suggestedWeek, suggestedFormat };
    });
}

/** Confirm an imported activity as a completed run session. */
export async function confirmImportedExercise(
  id: string,
  week: number,
  phase: number,
  plannedFormat: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: exercise } = await supabase
    .from("imported_exercises")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!exercise) return { error: "Exercise not found" };

  const ex = exercise as ImportedExercise;
  const { data: run, error: runError } = await supabase
    .from("run_sessions")
    .insert({
      user_id: user.id,
      date: ex.started_at.slice(0, 10),
      week_number: week,
      phase,
      planned_format: plannedFormat,
      total_duration_sec: ex.duration_min ? ex.duration_min * 60 : null,
      notes: `Imported from Fitbit — ${ex.activity_type}${
        ex.distance_km ? `, ${ex.distance_km} km` : ""
      }${ex.avg_hr ? `, avg HR ${ex.avg_hr}` : ""}`,
      source: "fitbit",
    })
    .select("id")
    .single();
  if (runError) return { error: runError.message };

  const { error: linkError } = await supabase
    .from("imported_exercises")
    .update({ confirmed: true, linked_run_session_id: run.id })
    .eq("id", id)
    .eq("user_id", user.id);
  if (linkError) return { error: linkError.message };

  revalidatePath("/run");
  revalidatePath("/settings/import");
  return { success: true };
}

export async function dismissImportedExercise(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("imported_exercises")
    .update({ dismissed: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings/import");
  return { success: true };
}
