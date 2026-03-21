"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { estimateMealNutrition, logMeal } from "@/lib/actions/nutrition";
import { Sparkles, Loader2, X } from "lucide-react";
import type { AIParsedFoodItem, MealType } from "@/types";

type Phase = "input" | "reviewing" | "logging";

const CONFIDENCE_STYLES = {
  high: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-orange-100 text-orange-700",
};

export function AIMealInput({ mealType }: { mealType: MealType }) {
  const [phase, setPhase] = useState<Phase>("input");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<AIParsedFoodItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleEstimate() {
    if (!description.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await estimateMealNutrition(description.trim());
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setItems(result.items);
      setPhase("reviewing");
    });
  }

  function updateItem(index: number, field: keyof AIParsedFoodItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleLogAll() {
    if (items.length === 0) return;
    setPhase("logging");

    startTransition(async () => {
      for (const item of items) {
        const formData = new FormData();
        formData.set("meal_type", mealType);
        formData.set("food_name", item.food_name);
        formData.set("calories", String(item.calories));
        formData.set("protein_g", String(item.protein_g));
        formData.set("carbs_g", String(item.carbs_g));
        formData.set("fat_g", String(item.fat_g));
        formData.set("source", "ai");
        await logMeal(formData);
      }
      router.push("/nutrition");
    });
  }

  function handleReset() {
    setPhase("input");
    setItems([]);
    setError(null);
  }

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  // Input phase
  if (phase === "input") {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Describe what you ate
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. chicken rice with extra drumstick and a teh c kosong"
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleEstimate();
              }
            }}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button
          onClick={handleEstimate}
          disabled={!description.trim() || isPending}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 active:scale-95 transition-transform"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing your meal...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Estimate Nutrition
            </>
          )}
        </button>

        <p className="text-[10px] text-muted-foreground text-center">
          AI estimates may not be exact. You can edit values before logging.
        </p>
      </div>
    );
  }

  // Reviewing phase
  if (phase === "reviewing") {
    return (
      <div className={`space-y-3 ${isPending ? "opacity-70 pointer-events-none" : ""}`}>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Review &amp; edit estimates
          </p>
          <button
            onClick={handleReset}
            className="text-xs text-primary hover:underline"
          >
            Try again
          </button>
        </div>

        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border bg-card p-3 shadow-sm space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={item.food_name}
                  onChange={(e) => updateItem(index, "food_name", e.target.value)}
                  className="w-full text-sm font-medium bg-transparent border-b border-transparent hover:border-input focus:border-input focus:outline-none px-0 py-0.5"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {item.serving_size}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CONFIDENCE_STYLES[item.confidence]}`}
                  >
                    {item.confidence}
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeItem(index)}
                className="text-muted-foreground hover:text-destructive p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ["calories", "Cal"],
                  ["protein_g", "Prot"],
                  ["carbs_g", "Carbs"],
                  ["fat_g", "Fat"],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="space-y-0.5">
                  <label className="text-[10px] text-muted-foreground">
                    {label}
                  </label>
                  <input
                    type="number"
                    value={item[field]}
                    onChange={(e) =>
                      updateItem(index, field, parseInt(e.target.value) || 0)
                    }
                    className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            All items removed.{" "}
            <button onClick={handleReset} className="text-primary hover:underline">
              Start over
            </button>
          </p>
        )}

        {items.length > 0 && (
          <>
            {/* Totals */}
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
              <span className="font-medium">Total</span>
              <div className="flex gap-3 text-muted-foreground">
                <span>{totals.calories} kcal</span>
                <span>{totals.protein_g}g P</span>
                <span>{totals.carbs_g}g C</span>
                <span>{totals.fat_g}g F</span>
              </div>
            </div>

            <button
              onClick={handleLogAll}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-transform"
            >
              Log {items.length} item{items.length !== 1 ? "s" : ""} to {mealType}
            </button>
          </>
        )}
      </div>
    );
  }

  // Logging phase
  return (
    <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Logging meals...
    </div>
  );
}
