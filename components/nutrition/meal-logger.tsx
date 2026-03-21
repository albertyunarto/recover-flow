"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logMeal, addCustomFood } from "@/lib/actions/nutrition";
import { initFoodSearch, searchFoods } from "@/lib/utils/search";
import { Search, Clock, UtensilsCrossed, Plus, Sparkles } from "lucide-react";
import { AIMealInput } from "@/components/nutrition/ai-meal-input";
import type { FoodItem, CustomFood, MealType } from "@/types";

// Inline a small set of quick-add hawker templates
// Full database loaded dynamically
const QUICK_ADD: FoodItem[] = [
  { id: "chicken-rice", name: "Chicken Rice", category: "hawker-rice", calories: 607, protein_g: 27, carbs_g: 73, fat_g: 22, serving_size: "1 plate", tags: [] },
  { id: "nasi-lemak", name: "Nasi Lemak", category: "hawker-rice", calories: 494, protein_g: 15, carbs_g: 60, fat_g: 22, serving_size: "1 plate", tags: [] },
  { id: "ban-mian", name: "Ban Mian", category: "hawker-noodle", calories: 475, protein_g: 20, carbs_g: 55, fat_g: 18, serving_size: "1 bowl", tags: [] },
  { id: "fish-soup-bee-hoon", name: "Fish Soup Bee Hoon", category: "hawker-soup", calories: 300, protein_g: 30, carbs_g: 35, fat_g: 5, serving_size: "1 bowl", tags: [] },
  { id: "roti-prata-plain", name: "Roti Prata (Plain)", category: "hawker-indian", calories: 209, protein_g: 5, carbs_g: 33, fat_g: 7, serving_size: "1 piece", tags: [] },
  { id: "economy-rice", name: "Economy Rice (1 meat 2 veg)", category: "hawker-rice", calories: 550, protein_g: 25, carbs_g: 65, fat_g: 20, serving_size: "1 plate", tags: [] },
  { id: "wanton-mee", name: "Wanton Mee (Dry)", category: "hawker-noodle", calories: 409, protein_g: 18, carbs_g: 52, fat_g: 14, serving_size: "1 plate", tags: [] },
  { id: "laksa", name: "Laksa", category: "hawker-noodle", calories: 589, protein_g: 18, carbs_g: 55, fat_g: 32, serving_size: "1 bowl", tags: [] },
  { id: "overnight-oats", name: "Overnight Oats + Banana", category: "breakfast", calories: 380, protein_g: 15, carbs_g: 55, fat_g: 10, serving_size: "1 bowl", tags: [] },
  { id: "kaya-toast-set", name: "Kaya Toast Set (with eggs)", category: "breakfast", calories: 370, protein_g: 14, carbs_g: 42, fat_g: 16, serving_size: "1 set", tags: [] },
  { id: "chicken-breast-rice", name: "Chicken Breast + Rice", category: "protein", calories: 450, protein_g: 40, carbs_g: 50, fat_g: 8, serving_size: "1 plate", tags: [] },
  { id: "greek-yogurt", name: "Greek Yogurt", category: "dairy", calories: 130, protein_g: 15, carbs_g: 8, fat_g: 4, serving_size: "170g", tags: [] },
];

type Tab = "ai" | "hawker" | "search" | "custom";

interface RecentMeal {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export function MealLogger({
  recentMeals,
  customFoods,
}: {
  recentMeals: RecentMeal[];
  customFoods: CustomFood[];
}) {
  const [tab, setTab] = useState<Tab>("ai");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [foodsLoaded, setFoodsLoaded] = useState(false);
  const router = useRouter();

  // Custom food form state
  const [customName, setCustomName] = useState("");
  const [customCal, setCustomCal] = useState("");
  const [customProt, setCustomProt] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");

  // Load food database for search
  useEffect(() => {
    async function loadFoods() {
      try {
        const [hawker, common] = await Promise.all([
          import("@/lib/data/foods/sg-hawker.json").then((m) => m.default).catch(() => ({ foods: [] })),
          import("@/lib/data/foods/common-foods.json").then((m) => m.default).catch(() => ({ foods: [] })),
        ]);
        const allFoods = [
          ...(hawker.foods || []),
          ...(common.foods || []),
        ] as FoodItem[];
        initFoodSearch(allFoods);
        setFoodsLoaded(true);
      } catch {
        // Foods not yet created, use quick-add only
        initFoodSearch(QUICK_ADD);
        setFoodsLoaded(true);
      }
    }
    loadFoods();
  }, []);

  useEffect(() => {
    if (foodsLoaded && searchQuery.length >= 2) {
      setSearchResults(searchFoods(searchQuery));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, foodsLoaded]);

  function handleQuickAdd(food: FoodItem | RecentMeal) {
    const formData = new FormData();
    formData.set("meal_type", mealType);
    formData.set("food_name", "food_name" in food ? food.food_name : food.name);
    formData.set("calories", String(food.calories));
    formData.set("protein_g", String(food.protein_g));
    formData.set("carbs_g", String(food.carbs_g));
    formData.set("fat_g", String(food.fat_g));
    formData.set("source", "template");
    if ("id" in food) formData.set("source_id", food.id);

    startTransition(async () => {
      await logMeal(formData);
      router.push("/nutrition");
    });
  }

  function handleCustomSubmit() {
    if (!customName || !customCal) return;

    const formData = new FormData();
    formData.set("meal_type", mealType);
    formData.set("food_name", customName);
    formData.set("calories", customCal);
    formData.set("protein_g", customProt || "0");
    formData.set("carbs_g", customCarbs || "0");
    formData.set("fat_g", customFat || "0");
    formData.set("source", "custom");

    startTransition(async () => {
      await logMeal(formData);
      // Also save as custom food for future use
      const cfForm = new FormData();
      cfForm.set("name", customName);
      cfForm.set("calories", customCal);
      cfForm.set("protein_g", customProt || "0");
      cfForm.set("carbs_g", customCarbs || "0");
      cfForm.set("fat_g", customFat || "0");
      await addCustomFood(cfForm);
      router.push("/nutrition");
    });
  }

  const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

  return (
    <div className={`space-y-4 ${isPending ? "opacity-70 pointer-events-none" : ""}`}>
      {/* Meal Type Selector */}
      <div className="flex gap-2">
        {MEAL_TYPES.map((mt) => (
          <button
            key={mt}
            onClick={() => setMealType(mt)}
            className={`flex-1 rounded-lg py-2 text-xs font-medium capitalize transition-colors ${
              mealType === mt
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {mt}
          </button>
        ))}
      </div>

      {/* Recent Meals */}
      {recentMeals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Recent
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recentMeals.map((meal, i) => (
              <button
                key={i}
                onClick={() => handleQuickAdd(meal)}
                className="flex-shrink-0 rounded-lg border bg-card px-3 py-2 text-left active-scale"
              >
                <p className="text-xs font-medium truncate max-w-[140px]">
                  {meal.food_name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {meal.calories} kcal
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex rounded-lg bg-muted p-1">
        {[
          { key: "ai" as Tab, label: "AI", icon: Sparkles },
          { key: "hawker" as Tab, label: "SG Hawker", icon: UtensilsCrossed },
          { key: "search" as Tab, label: "Search", icon: Search },
          { key: "custom" as Tab, label: "Custom", icon: Plus },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors ${
              tab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* AI Tab */}
      {tab === "ai" && <AIMealInput mealType={mealType} />}

      {/* Hawker Tab */}
      {tab === "hawker" && (
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ADD.map((food) => (
            <button
              key={food.id}
              onClick={() => handleQuickAdd(food)}
              className="rounded-xl border bg-card p-3 text-left active-scale"
            >
              <p className="text-sm font-medium">{food.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {food.calories} kcal &middot; {food.protein_g}g P
              </p>
              <p className="text-[10px] text-muted-foreground">
                {food.serving_size}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Search Tab */}
      {tab === "search" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search foods (e.g. chicken rice, mee rebus)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
            />
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map((food) => (
                <button
                  key={food.id}
                  onClick={() => handleQuickAdd(food)}
                  className="flex items-center justify-between w-full rounded-lg bg-muted/50 px-3 py-2.5 text-left active-scale"
                >
                  <div>
                    <p className="text-sm font-medium">{food.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {food.serving_size}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{food.calories} kcal</p>
                    <p>{food.protein_g}g P</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No results. Try the Custom tab to add a new food.
            </p>
          )}
        </div>
      )}

      {/* Custom Tab */}
      {tab === "custom" && (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Food Name</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Grilled salmon + quinoa"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Calories *
              </label>
              <input
                type="number"
                value={customCal}
                onChange={(e) => setCustomCal(e.target.value)}
                placeholder="350"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Protein (g)
              </label>
              <input
                type="number"
                value={customProt}
                onChange={(e) => setCustomProt(e.target.value)}
                placeholder="30"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Carbs (g)</label>
              <input
                type="number"
                value={customCarbs}
                onChange={(e) => setCustomCarbs(e.target.value)}
                placeholder="40"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Fat (g)</label>
              <input
                type="number"
                value={customFat}
                onChange={(e) => setCustomFat(e.target.value)}
                placeholder="10"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleCustomSubmit}
            disabled={!customName || !customCal}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 active:scale-95 transition-transform"
          >
            Add to {mealType}
          </button>
        </div>
      )}
    </div>
  );
}
