import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { MealLogger } from "@/components/nutrition/meal-logger";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function BrowseFoodsPage() {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
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
      <div className="flex items-center gap-2">
        <Link
          href="/nutrition/log"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">Browse Foods</h1>
      </div>
      <MealLogger recentMeals={recentMeals} customFoods={customFoods ?? []} />
    </div>
  );
}
