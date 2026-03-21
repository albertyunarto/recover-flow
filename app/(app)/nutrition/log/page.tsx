import { createClient } from "@/lib/supabase/server";
import { MealLogger } from "@/components/nutrition/meal-logger";

export default async function NutritionLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch recent meals and custom foods
  const [{ data: recentEntries }, { data: customFoods }] = await Promise.all([
    supabase
      .from("nutrition_entries")
      .select(
        "food_name, calories, protein_g, carbs_g, fat_g, source, source_id"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("custom_foods")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  // Deduplicate recent meals by food_name
  const seen = new Set<string>();
  const recentMeals = (recentEntries ?? [])
    .filter((item) => {
      if (seen.has(item.food_name)) return false;
      seen.add(item.food_name);
      return true;
    })
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Log Meal</h1>
      <MealLogger
        recentMeals={recentMeals}
        customFoods={customFoods ?? []}
      />
    </div>
  );
}
