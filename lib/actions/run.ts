"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatDateSG } from "@/lib/utils";
import type { RunSession } from "@/types";

export async function logRun(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const today = formatDateSG();

  const week_number = parseInt(formData.get("week_number") as string, 10);
  const phase = parseInt(formData.get("phase") as string, 10);
  const planned_format = (formData.get("planned_format") as string) ?? "";

  const total_duration_raw = formData.get("total_duration_sec");
  const total_run_raw = formData.get("total_run_sec");
  const total_walk_raw = formData.get("total_walk_sec");
  const cycles_raw = formData.get("cycles_completed");
  const effort_raw = formData.get("perceived_effort");
  const notes = (formData.get("notes") as string) || null;

  const total_duration_sec = total_duration_raw ? parseInt(total_duration_raw as string, 10) : null;
  const total_run_sec = total_run_raw ? parseInt(total_run_raw as string, 10) : null;
  const total_walk_sec = total_walk_raw ? parseInt(total_walk_raw as string, 10) : null;
  const cycles_completed = cycles_raw ? parseInt(cycles_raw as string, 10) : null;
  const perceived_effort = effort_raw ? parseInt(effort_raw as string, 10) : null;

  const { error } = await supabase.from("run_sessions").insert({
    user_id: user.id,
    date: today,
    week_number,
    phase,
    planned_format,
    total_duration_sec,
    total_run_sec,
    total_walk_sec,
    cycles_completed,
    perceived_effort,
    notes,
  });

  if (error) return { error: error.message };

  revalidatePath("/run");
  revalidatePath("/run/history");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getRunHistory(): Promise<RunSession[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("run_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error) return [];
  return (data as RunSession[]) ?? [];
}

export async function getRunsThisWeek(weekNumber: number): Promise<RunSession[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("run_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_number", weekNumber)
    .order("date", { ascending: true });

  if (error) return [];
  return (data as RunSession[]) ?? [];
}
