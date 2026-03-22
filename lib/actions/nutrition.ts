"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatDateSG } from "@/lib/utils";
import type { MealType } from "@/types";

export async function logMeal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("nutrition_entries").insert({
    user_id: user.id,
    date: formatDateSG(),
    meal_type: formData.get("meal_type") as MealType,
    food_name: formData.get("food_name") as string,
    calories: parseInt(formData.get("calories") as string),
    protein_g: parseInt(formData.get("protein_g") as string) || 0,
    carbs_g: parseInt(formData.get("carbs_g") as string) || 0,
    fat_g: parseInt(formData.get("fat_g") as string) || 0,
    source: (formData.get("source") as string) || "custom",
    source_id: formData.get("source_id") as string | null,
    ai_reasoning: formData.get("ai_reasoning") as string | null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/nutrition");
  revalidatePath("/nutrition/log");
  return { success: true };
}

export async function deleteMealEntry(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("nutrition_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/nutrition");
  revalidatePath("/nutrition/log");
  return { success: true };
}

export async function updateMealEntry(
  id: string,
  updates: {
    food_name?: string;
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("nutrition_entries")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/nutrition");
  revalidatePath("/nutrition/log");
  return { success: true };
}

export async function addCustomFood(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("custom_foods")
    .insert({
      user_id: user.id,
      name: formData.get("name") as string,
      calories: parseInt(formData.get("calories") as string),
      protein_g: parseInt(formData.get("protein_g") as string) || 0,
      carbs_g: parseInt(formData.get("carbs_g") as string) || 0,
      fat_g: parseInt(formData.get("fat_g") as string) || 0,
      category: formData.get("category") as string | null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  return { success: true, food: data };
}

export async function getTodaysNutrition() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { entries: [], totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 } };

  const today = formatDateSG();
  const { data: entries } = await supabase
    .from("nutrition_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .order("created_at");

  const items = entries ?? [];
  const totals = {
    calories: items.reduce((s, e) => s + e.calories, 0),
    protein_g: items.reduce((s, e) => s + e.protein_g, 0),
    carbs_g: items.reduce((s, e) => s + e.carbs_g, 0),
    fat_g: items.reduce((s, e) => s + e.fat_g, 0),
  };

  return { entries: items, totals };
}

export async function estimateMealNutrition(description: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { parseNutritionFromText } = await import("@/lib/ai/gemini");
  return parseNutritionFromText(description);
}

export async function getRecentMeals() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("nutrition_entries")
    .select("food_name, calories, protein_g, carbs_g, fat_g, source, source_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Deduplicate by food_name
  const seen = new Set<string>();
  return (data ?? []).filter((item) => {
    if (seen.has(item.food_name)) return false;
    seen.add(item.food_name);
    return true;
  }).slice(0, 5);
}
