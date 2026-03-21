import Fuse from "fuse.js";
import type { FoodItem } from "@/types";

let fuseInstance: Fuse<FoodItem> | null = null;
let loadedFoods: FoodItem[] = [];

export function initFoodSearch(foods: FoodItem[]) {
  loadedFoods = foods;
  fuseInstance = new Fuse(foods, {
    keys: [
      { name: "name", weight: 0.7 },
      { name: "tags", weight: 0.2 },
      { name: "category", weight: 0.1 },
    ],
    threshold: 0.3,
    includeScore: true,
  });
}

export function searchFoods(query: string): FoodItem[] {
  if (!fuseInstance || !query.trim()) return [];
  return fuseInstance.search(query).map((r) => r.item).slice(0, 20);
}

export function getAllFoods(): FoodItem[] {
  return loadedFoods;
}

export function getFoodsByCategory(category: string): FoodItem[] {
  return loadedFoods.filter((f) => f.category === category);
}
