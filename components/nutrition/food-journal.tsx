"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  estimateMealNutrition,
  logMeal,
} from "@/lib/actions/nutrition";
import { inferMealType } from "@/lib/utils";
import { Sparkles, Loader2, Send, UtensilsCrossed } from "lucide-react";
import { JournalEntry } from "@/components/nutrition/journal-entry";
import type { NutritionEntry, MealType } from "@/types";

interface Props {
  entries: NutritionEntry[];
  calTarget: number;
  protTarget: number;
}

export function FoodJournal({ entries: initialEntries, calTarget, protTarget }: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState<MealType>(inferMealType);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Sync with server-refreshed data
  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein_g: acc.protein_g + e.protein_g,
      carbs_g: acc.carbs_g + e.carbs_g,
      fat_g: acc.fat_g + e.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const calPct = Math.min(Math.round((totals.calories / calTarget) * 100), 100);
  const protPct = Math.min(Math.round((totals.protein_g / protTarget) * 100), 100);

  function handleSubmit() {
    if (!description.trim() || isPending) return;
    const text = description.trim();
    setDescription("");
    setError(null);

    startTransition(async () => {
      const result = await estimateMealNutrition(text);
      if ("error" in result) {
        setError(result.error);
        setDescription(text);
        return;
      }

      // Log each item immediately
      for (const item of result.items) {
        const formData = new FormData();
        formData.set("meal_type", mealType);
        formData.set("food_name", item.food_name);
        formData.set("calories", String(item.calories));
        formData.set("protein_g", String(item.protein_g));
        formData.set("carbs_g", String(item.carbs_g));
        formData.set("fat_g", String(item.fat_g));
        formData.set("source", "ai");
        formData.set("ai_reasoning", item.reasoning || "");
        await logMeal(formData);
      }

      // Refresh to get server data with proper IDs
      router.refresh();
    });
  }

  function handleRemoveEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

  return (
    <div className="flex flex-col h-full">
      {/* Daily Progress */}
      <div className="rounded-xl border bg-card p-4 shadow-sm mb-4">
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

      {/* Entries List */}
      <div ref={listRef} className="flex-1 space-y-2 mb-4 min-h-0 overflow-y-auto">
        {entries.length === 0 && !isPending && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <UtensilsCrossed className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No meals logged today</p>
            <p className="text-xs mt-1">
              Type what you ate below to get started
            </p>
          </div>
        )}

        {entries.map((entry) => (
          <JournalEntry
            key={entry.id}
            entry={entry}
            onRemove={handleRemoveEntry}
          />
        ))}

        {isPending && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing and logging...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="space-y-2 pt-2 border-t">
        {/* Meal Type Pills */}
        <div className="flex gap-1.5">
          {MEAL_TYPES.map((mt) => (
            <button
              key={mt}
              onClick={() => setMealType(mt)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium capitalize transition-colors ${
                mealType === mt
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {mt}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Text Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="What did you eat?"
              disabled={isPending}
              className="flex h-10 w-full rounded-full border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              autoFocus
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!description.trim() || isPending}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 active:scale-95 transition-transform flex-shrink-0"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          AI estimates &middot; tap entries to edit
        </p>
      </div>
    </div>
  );
}
