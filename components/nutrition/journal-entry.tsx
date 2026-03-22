"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { deleteMealEntry, updateMealEntry } from "@/lib/actions/nutrition";
import type { NutritionEntry } from "@/types";

export function JournalEntry({
  entry,
  onRemove,
}: {
  entry: NutritionEntry;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Edit state
  const [editValues, setEditValues] = useState({
    food_name: entry.food_name,
    calories: entry.calories,
    protein_g: entry.protein_g,
    carbs_g: entry.carbs_g,
    fat_g: entry.fat_g,
  });

  function handleDelete() {
    onRemove(entry.id);
    startTransition(async () => {
      await deleteMealEntry(entry.id);
    });
  }

  function handleSave() {
    setEditing(false);
    startTransition(async () => {
      await updateMealEntry(entry.id, editValues);
    });
  }

  return (
    <div
      className={`rounded-xl border bg-card transition-all ${isPending ? "opacity-50" : ""}`}
    >
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {entry.source === "ai" && (
            <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
          )}
          <span className="text-sm font-medium truncate">
            {editing ? editValues.food_name : entry.food_name}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {editing ? editValues.calories : entry.calories} kcal
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t pt-2">
          {editing ? (
            <>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">
                  Food Name
                </label>
                <input
                  type="text"
                  value={editValues.food_name}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, food_name: e.target.value }))
                  }
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
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
                      value={editValues[field]}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          [field]: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 h-8 rounded-md bg-primary text-xs font-medium text-primary-foreground"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditValues({
                      food_name: entry.food_name,
                      calories: entry.calories,
                      protein_g: entry.protein_g,
                      carbs_g: entry.carbs_g,
                      fat_g: entry.fat_g,
                    });
                  }}
                  className="flex-1 h-8 rounded-md border text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Macros row */}
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{entry.protein_g}g protein</span>
                <span>{entry.carbs_g}g carbs</span>
                <span>{entry.fat_g}g fat</span>
              </div>

              {/* AI Reasoning */}
              {entry.ai_reasoning && (
                <div className="rounded-lg bg-primary/5 px-2.5 py-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="font-medium text-foreground">
                      AI reasoning
                    </span>
                  </div>
                  {entry.ai_reasoning}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex items-center gap-1 text-xs text-destructive hover:underline"
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
