"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatDateSG } from "@/lib/utils";
import type { PainEntry } from "@/types";

export async function logPain(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const today = formatDateSG();
  const time_of_day = formData.get("time_of_day") as "AM" | "PM";
  const notes = (formData.get("notes") as string) || null;

  const neck_raw = formData.get("neck_score");
  const back_raw = formData.get("back_score");
  const elbow_raw = formData.get("elbow_score");
  const knee_raw = formData.get("knee_score");

  const neck_score =
    neck_raw !== null && neck_raw !== "" ? parseInt(neck_raw as string, 10) : null;
  const back_score =
    back_raw !== null && back_raw !== "" ? parseInt(back_raw as string, 10) : null;
  const elbow_score =
    elbow_raw !== null && elbow_raw !== "" ? parseInt(elbow_raw as string, 10) : null;
  const knee_score =
    knee_raw !== null && knee_raw !== "" ? parseInt(knee_raw as string, 10) : null;

  // Check for existing entry with same user_id + date + time_of_day
  const { data: existing } = await supabase
    .from("pain_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", today)
    .eq("time_of_day", time_of_day)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("pain_entries")
      .update({ neck_score, back_score, elbow_score, knee_score, notes })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("pain_entries").insert({
      user_id: user.id,
      date: today,
      time_of_day,
      neck_score,
      back_score,
      elbow_score,
      knee_score,
      notes: notes || null,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/pain");
  return { success: true };
}

export async function getPainTrends(
  range: "7d" | "30d" | "all"
): Promise<PainEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from("pain_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  if (range !== "all") {
    const days = range === "7d" ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    query = query.gte("date", cutoffStr);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data as PainEntry[]) ?? [];
}
