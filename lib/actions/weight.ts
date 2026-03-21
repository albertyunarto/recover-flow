"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatDateSG } from "@/lib/utils";
import type { WeightEntry } from "@/types";

export async function logWeight(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const date = (formData.get("date") as string) || formatDateSG();
  const weight_raw = formData.get("weight_kg") as string;
  const notes = (formData.get("notes") as string) || null;

  if (!weight_raw) return { error: "Weight is required" };

  const weight_kg = parseFloat(weight_raw);
  if (isNaN(weight_kg) || weight_kg < 20 || weight_kg > 300) {
    return { error: "Invalid weight value" };
  }

  // Check for existing entry for this user + date (upsert)
  const { data: existing } = await supabase
    .from("weight_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("weight_entries")
      .update({ weight_kg, notes })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("weight_entries").insert({
      user_id: user.id,
      date,
      weight_kg,
      notes,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/progress");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getWeightHistory(): Promise<WeightEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("weight_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  if (error) return [];
  return (data as WeightEntry[]) ?? [];
}
