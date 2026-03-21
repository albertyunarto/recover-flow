"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { initFoodSearch, searchFoods, getAllFoods } from "@/lib/utils/search";
import type { FoodItem } from "@/types";

export default function FoodDatabasePage() {
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [allFoods, setAllFoods] = useState<FoodItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const [hawker, common] = await Promise.all([
          import("@/lib/data/foods/sg-hawker.json")
            .then((m) => m.default)
            .catch(() => ({ foods: [] })),
          import("@/lib/data/foods/common-foods.json")
            .then((m) => m.default)
            .catch(() => ({ foods: [] })),
        ]);
        const all = [
          ...(hawker.foods || []),
          ...(common.foods || []),
        ] as FoodItem[];
        initFoodSearch(all);
        setAllFoods(all);
        setFoods(all);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (query.length >= 2) {
      const results = searchFoods(query);
      setFoods(
        selectedCategory === "all"
          ? results
          : results.filter((f) => f.category === selectedCategory)
      );
    } else {
      setFoods(
        selectedCategory === "all"
          ? allFoods
          : allFoods.filter((f) => f.category === selectedCategory)
      );
    }
  }, [query, selectedCategory, loaded, allFoods]);

  const categories = [
    "all",
    ...Array.from(new Set(allFoods.map((f) => f.category))).sort(),
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Food Database</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search foods..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {cat === "all" ? "All" : cat.replace("hawker-", "").replace("-", " ")}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{foods.length} items</p>

      <div className="space-y-1">
        {foods.map((food) => (
          <div
            key={food.id}
            className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5"
          >
            <div>
              <p className="text-sm font-medium">{food.name}</p>
              <p className="text-xs text-muted-foreground">
                {food.serving_size} &middot; {food.category.replace("hawker-", "")}
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="font-medium">{food.calories} kcal</p>
              <p className="text-muted-foreground">
                P:{food.protein_g}g C:{food.carbs_g}g F:{food.fat_g}g
              </p>
            </div>
          </div>
        ))}
        {foods.length === 0 && loaded && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No foods found. Try a different search term.
          </p>
        )}
      </div>
    </div>
  );
}
