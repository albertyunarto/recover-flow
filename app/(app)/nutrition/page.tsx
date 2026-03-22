import { getAuthUser, getUserProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateSG } from "@/lib/utils";
import Link from "next/link";
import { Plus, Clock, Search, BookOpen } from "lucide-react";

export default async function NutritionPage() {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const today = formatDateSG();

  const [profile, { data: entries }] = await Promise.all([
    getUserProfile(),
    supabase
      .from("nutrition_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .order("created_at"),
  ]);

  const meals = entries ?? [];
  const totals = {
    calories: meals.reduce((s, e) => s + e.calories, 0),
    protein_g: meals.reduce((s, e) => s + e.protein_g, 0),
    carbs_g: meals.reduce((s, e) => s + e.carbs_g, 0),
    fat_g: meals.reduce((s, e) => s + e.fat_g, 0),
  };

  const calTarget = profile?.daily_calorie_target ?? 1850;
  const protTarget = profile?.daily_protein_target ?? 140;
  const calPct = Math.min(Math.round((totals.calories / calTarget) * 100), 100);
  const protPct = Math.min(
    Math.round((totals.protein_g / protTarget) * 100),
    100
  );

  const mealGroups = {
    breakfast: meals.filter((m) => m.meal_type === "breakfast"),
    lunch: meals.filter((m) => m.meal_type === "lunch"),
    dinner: meals.filter((m) => m.meal_type === "dinner"),
    snack: meals.filter((m) => m.meal_type === "snack"),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nutrition</h1>
        <Link
          href="/nutrition/log"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" />
          Log Meal
        </Link>
      </div>

      {/* Daily Progress */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-bold">{totals.calories}</span>
              <span className="text-xs text-muted-foreground">
                / {calTarget} kcal
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${calPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {calTarget - totals.calories > 0
                ? `${calTarget - totals.calories} remaining`
                : "Target reached!"}
            </p>
          </div>
          <div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-bold">{totals.protein_g}</span>
              <span className="text-xs text-muted-foreground">
                / {protTarget}g protein
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${protPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {protTarget - totals.protein_g > 0
                ? `${protTarget - totals.protein_g}g remaining`
                : "Target reached!"}
            </p>
          </div>
        </div>
        <div className="flex gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
          <span>Carbs: {totals.carbs_g}g</span>
          <span>Fat: {totals.fat_g}g</span>
        </div>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-3 gap-2">
        <Link
          href="/nutrition/database"
          className="flex flex-col items-center gap-1 rounded-xl border bg-card p-3 text-center active-scale"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Food DB</span>
        </Link>
        <Link
          href="/nutrition/meal-plan"
          className="flex flex-col items-center gap-1 rounded-xl border bg-card p-3 text-center active-scale"
        >
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Meal Plans</span>
        </Link>
        <Link
          href="/nutrition/history"
          className="flex flex-col items-center gap-1 rounded-xl border bg-card p-3 text-center active-scale"
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">History</span>
        </Link>
      </div>

      {/* Today's Meals */}
      {(
        ["breakfast", "lunch", "dinner", "snack"] as const
      ).map((mealType) => {
        const items = mealGroups[mealType];
        return (
          <div key={mealType} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium capitalize">{mealType}</h3>
              <span className="text-xs text-muted-foreground">
                {items.reduce((s, m) => s + m.calories, 0)} kcal
              </span>
            </div>
            {items.length > 0 ? (
              <div className="space-y-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <span className="text-sm">{item.food_name}</span>
                    <div className="text-xs text-muted-foreground">
                      {item.calories} kcal &middot; {item.protein_g}g P
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Link
                href={`/nutrition/log?meal=${mealType}`}
                className="block rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                + Add {mealType}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
