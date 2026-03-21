"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatDateSG } from "@/lib/utils";
import type { ExerciseLog, ExerciseCompletion, ProtocolType } from "@/types";

export async function logExerciseSession(data: {
  protocol: ProtocolType;
  exercises: ExerciseCompletion[];
  phase: number;
  duration_minutes?: number;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const today = formatDateSG();
  const completed_count = data.exercises.filter(
    (e) => !e.skipped && e.sets_completed >= e.total_sets
  ).length;
  const total_exercises = data.exercises.length;

  // Check for existing log for this user + date + protocol
  const { data: existing } = await supabase
    .from("exercise_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", today)
    .eq("protocol", data.protocol)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("exercise_logs")
      .update({
        exercises: data.exercises,
        total_exercises,
        completed_count,
        duration_minutes: data.duration_minutes ?? null,
        phase: data.phase,
      })
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("exercise_logs").insert({
      user_id: user.id,
      date: today,
      protocol: data.protocol,
      exercises: data.exercises,
      total_exercises,
      completed_count,
      duration_minutes: data.duration_minutes ?? null,
      phase: data.phase,
    });

    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/exercises");
  return { success: true };
}

export async function getTodaysExerciseLogs(): Promise<ExerciseLog[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const today = formatDateSG();

  const { data, error } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .order("created_at");

  if (error) return [];
  return (data as ExerciseLog[]) ?? [];
}
