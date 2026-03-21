"use client";

import { useState, useEffect } from "react";
import { BookOpen, RefreshCw } from "lucide-react";
import type { MealPlanDay } from "@/types";

interface MealPlan {
  name: string;
  meals: {
    type: string;
    food_id: string;
    food_name: string;
    calories: number;
    protein_g: number;
  }[];
  total_calories: number;
  total_protein_g: number;
}

export default function MealPlanPage() {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const data = await import("@/lib/data/meals/meal-plans.json").then(
          (m) => m.default
        );
        setPlans(data.plans || []);
      } catch {
        // Meal plans not yet created
        setPlans([
          {
            name: "Hawker Balanced",
            meals: [
              { type: "breakfast", food_id: "overnight-oats", food_name: "Overnight Oats + Greek Yogurt + Banana", calories: 380, protein_g: 25 },
              { type: "lunch", food_id: "fish-soup", food_name: "Sliced Fish Soup with Bee Hoon", calories: 350, protein_g: 35 },
              { type: "dinner", food_id: "economy-rice", food_name: "Economy Rice (1 meat, 2 veg)", calories: 550, protein_g: 30 },
              { type: "snack", food_id: "yogurt-bar", food_name: "Greek Yogurt + Protein Bar", calories: 350, protein_g: 45 },
            ],
            total_calories: 1630,
            total_protein_g: 135,
          },
        ]);
      }
    }
    load();
  }, []);

  const plan = plans[currentPlan];

  function nextPlan() {
    setCurrentPlan((prev) => (prev + 1) % plans.length);
  }

  if (!plan) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Meal Plans</h1>
        {plans.length > 1 && (
          <button
            onClick={nextPlan}
            className="inline-flex items-center gap-1.5 text-sm text-primary active-scale"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Swap
          </button>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium">{plan.name}</h2>
        </div>

        <div className="space-y-3">
          {plan.meals.map((meal, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5"
            >
              <div>
                <p className="text-[10px] font-medium uppercase text-muted-foreground">
                  {meal.type}
                </p>
                <p className="text-sm">{meal.food_name}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{meal.calories} kcal</p>
                <p>{meal.protein_g}g P</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-4 pt-3 border-t">
          <div>
            <p className="text-lg font-bold">{plan.total_calories}</p>
            <p className="text-xs text-muted-foreground">kcal total</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{plan.total_protein_g}g</p>
            <p className="text-xs text-muted-foreground">protein total</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Target: ~1,850 kcal / 140g protein daily. Plans leave room for
        adjustments.
      </p>
    </div>
  );
}
