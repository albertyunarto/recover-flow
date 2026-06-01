"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateTargets(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const updates: Record<string, number> = {};

  const calories = formData.get("daily_calorie_target");
  if (calories) updates.daily_calorie_target = parseInt(calories as string);

  const protein = formData.get("daily_protein_target");
  if (protein) updates.daily_protein_target = parseInt(protein as string);

  const water = formData.get("daily_water_target_ml");
  if (water) updates.daily_water_target_ml = parseInt(water as string);

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function updatePhase(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const phase = parseInt(formData.get("phase") as string);
  const week = parseInt(formData.get("week") as string);

  if (phase < 1 || phase > 4 || week < 1 || week > 16) {
    return { error: "Invalid phase or week" };
  }

  const { error } = await supabase
    .from("users")
    .update({ current_phase: phase, current_week: week })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function advancePhase() {
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

  if (profile.current_phase >= 4) {
    return { error: "Already at maximum phase" };
  }

  const { error } = await supabase
    .from("users")
    .update({
      current_phase: profile.current_phase + 1,
      current_week: profile.current_week + 1,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}
