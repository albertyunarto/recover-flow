"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { WeeklyStats, GateCriterion, WeeklyReview } from "@/types";
import phasesData from "@/lib/data/phases.json";

export async function getWeeklyStats(weekNumber: number): Promise<WeeklyStats | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Determine date range for the week
  const { data: profile } = await supabase
    .from("users")
    .select("plan_start_date, current_phase")
    .eq("id", user.id)
    .single();

  const planStart = profile?.plan_start_date
    ? new Date(profile.plan_start_date)
    : new Date();

  const weekStartDate = new Date(planStart);
  weekStartDate.setDate(planStart.getDate() + (weekNumber - 1) * 7);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);

  const weekStartStr = weekStartDate.toISOString().split("T")[0];
  const weekEndStr = weekEndDate.toISOString().split("T")[0];

  // Previous week for trend comparison
  const prevWeekStart = new Date(weekStartDate);
  prevWeekStart.setDate(weekStartDate.getDate() - 7);
  const prevWeekEnd = new Date(prevWeekStart);
  prevWeekEnd.setDate(prevWeekStart.getDate() + 6);
  const prevWeekStartStr = prevWeekStart.toISOString().split("T")[0];
  const prevWeekEndStr = prevWeekEnd.toISOString().split("T")[0];

  // Fetch all data in parallel
  const [
    { data: painEntries },
    { data: prevPainEntries },
    { data: exerciseLogs },
    { data: nutritionEntries },
    { data: runSessions },
    { data: weightEntries },
  ] = await Promise.all([
    supabase
      .from("pain_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", weekStartStr)
      .lte("date", weekEndStr),
    supabase
      .from("pain_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", prevWeekStartStr)
      .lte("date", prevWeekEndStr),
    supabase
      .from("exercise_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", weekStartStr)
      .lte("date", weekEndStr),
    supabase
      .from("nutrition_entries")
      .select("date, calories, protein_g")
      .eq("user_id", user.id)
      .gte("date", weekStartStr)
      .lte("date", weekEndStr),
    supabase
      .from("run_sessions")
      .select("total_duration_sec, total_run_sec")
      .eq("user_id", user.id)
      .gte("date", weekStartStr)
      .lte("date", weekEndStr),
    supabase
      .from("weight_entries")
      .select("weight_kg, date")
      .eq("user_id", user.id)
      .gte("date", weekStartStr)
      .lte("date", weekEndStr)
      .order("date", { ascending: false }),
  ]);

  // Calculate average pain per region
  function avgPainRegion(
    entries: Array<{ neck_score: number | null; back_score: number | null; elbow_score: number | null; knee_score: number | null }>,
    region: "neck_score" | "back_score" | "elbow_score" | "knee_score"
  ): number {
    const vals = (entries ?? [])
      .map((e) => e[region])
      .filter((v): v is number => v !== null);
    if (vals.length === 0) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }

  const avg_pain = {
    neck: avgPainRegion(painEntries ?? [], "neck_score"),
    back: avgPainRegion(painEntries ?? [], "back_score"),
    elbow: avgPainRegion(painEntries ?? [], "elbow_score"),
    knee: avgPainRegion(painEntries ?? [], "knee_score"),
  };

  const prev_pain = {
    neck: avgPainRegion(prevPainEntries ?? [], "neck_score"),
    back: avgPainRegion(prevPainEntries ?? [], "back_score"),
    elbow: avgPainRegion(prevPainEntries ?? [], "elbow_score"),
    knee: avgPainRegion(prevPainEntries ?? [], "knee_score"),
  };

  function trend(curr: number, prev: number): "up" | "down" | "stable" {
    if (prev === 0 && curr === 0) return "stable";
    const diff = curr - prev;
    if (Math.abs(diff) < 0.5) return "stable";
    return diff > 0 ? "up" : "down";
  }

  const pain_trends = {
    neck: trend(avg_pain.neck, prev_pain.neck),
    back: trend(avg_pain.back, prev_pain.back),
    elbow: trend(avg_pain.elbow, prev_pain.elbow),
    knee: trend(avg_pain.knee, prev_pain.knee),
  };

  // Exercise adherence: completed sessions / expected sessions
  const expectedSessionsPerWeek = 5; // exercises roughly 5x/week
  const uniqueExerciseDays = new Set(
    (exerciseLogs ?? []).map((l: { date: string }) => l.date)
  ).size;
  const exercise_adherence_pct = Math.min(
    100,
    Math.round((uniqueExerciseDays / expectedSessionsPerWeek) * 100)
  );

  // Avg daily calories and protein
  const nutritionByDay = new Map<string, { calories: number; protein: number }>();
  for (const entry of nutritionEntries ?? []) {
    const ex = nutritionByDay.get(entry.date) ?? { calories: 0, protein: 0 };
    nutritionByDay.set(entry.date, {
      calories: ex.calories + entry.calories,
      protein: ex.protein + entry.protein_g,
    });
  }
  const nutritionDays = nutritionByDay.size;
  const avg_daily_calories =
    nutritionDays > 0
      ? Math.round(
          Array.from(nutritionByDay.values()).reduce((a, b) => a + b.calories, 0) /
            nutritionDays
        )
      : 0;
  const avg_daily_protein =
    nutritionDays > 0
      ? Math.round(
          Array.from(nutritionByDay.values()).reduce((a, b) => a + b.protein, 0) /
            nutritionDays
        )
      : 0;

  // Total run minutes
  const total_run_sec = (runSessions ?? []).reduce(
    (acc: number, s: { total_run_sec: number | null }) => acc + (s.total_run_sec ?? 0),
    0
  );
  const total_run_minutes = Math.round(total_run_sec / 60);

  // Latest weight this week
  const latestWeight = weightEntries?.[0]?.weight_kg ?? null;

  // Weight change vs previous week
  let weight_change_kg: number | null = null;
  if (latestWeight !== null) {
    const { data: prevWeight } = await supabase
      .from("weight_entries")
      .select("weight_kg")
      .eq("user_id", user.id)
      .gte("date", prevWeekStartStr)
      .lte("date", prevWeekEndStr)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prevWeight?.weight_kg) {
      weight_change_kg = Math.round((latestWeight - prevWeight.weight_kg) * 10) / 10;
    }
  }

  return {
    avg_pain,
    pain_trends,
    exercise_adherence_pct,
    avg_daily_calories,
    avg_daily_protein,
    total_run_minutes,
    weight_kg: latestWeight ? parseFloat(String(latestWeight)) : null,
    weight_change_kg,
  };
}

export async function submitReview(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const week_number = parseInt(formData.get("week_number") as string, 10);
  const phase = parseInt(formData.get("phase") as string, 10);
  const notes = (formData.get("notes") as string) || null;
  const gate_criteria_raw = formData.get("gate_criteria") as string;

  let gate_criteria: GateCriterion[] | null = null;
  if (gate_criteria_raw) {
    try {
      gate_criteria = JSON.parse(gate_criteria_raw);
    } catch {}
  }

  // Get aggregated stats to persist with the review
  const stats = await getWeeklyStats(week_number);

  const payload = {
    user_id: user.id,
    week_number,
    phase,
    notes,
    gate_criteria,
    week_completed: true,
    avg_pain: stats?.avg_pain ?? null,
    exercise_adherence_pct: stats?.exercise_adherence_pct ?? null,
    total_run_minutes: stats?.total_run_minutes ?? null,
    avg_daily_calories: stats?.avg_daily_calories ?? null,
    avg_daily_protein: stats?.avg_daily_protein ?? null,
    weight_kg: stats?.weight_kg ?? null,
    weight_change_kg: stats?.weight_change_kg ?? null,
  };

  // Upsert
  const { data: existing } = await supabase
    .from("weekly_reviews")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_number", week_number)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("weekly_reviews")
      .update(payload)
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("weekly_reviews").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/progress");
  revalidatePath("/progress/review");
  return { success: true };
}

export async function advancePhase(): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("users")
    .select("current_phase, current_week")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found" };
  if (profile.current_phase >= 4) return { error: "Already at maximum phase" };

  const { error } = await supabase
    .from("users")
    .update({
      current_phase: profile.current_phase + 1,
      current_week: profile.current_week + 1,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/progress");
  return { success: true };
}

export async function getWeeklyReview(weekNumber: number): Promise<WeeklyReview | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_number", weekNumber)
    .maybeSingle();

  if (error || !data) return null;
  return data as WeeklyReview;
}
