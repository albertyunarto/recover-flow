"use client";

import { Droplets, Plus } from "lucide-react";
import type { HydrationLog } from "@/types";

export function HydrationCard({
  log,
  targetMl,
  onAddGlass,
}: {
  log: HydrationLog | null;
  targetMl: number;
  onAddGlass: () => void;
}) {
  const glasses = log?.glasses ?? 0;
  const targetGlasses = Math.ceil(targetMl / 250);
  const pct = Math.min((glasses / targetGlasses) * 100, 100);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Droplets className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Water</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{glasses}</span>
            <span className="text-xs text-muted-foreground">
              /{targetGlasses} glasses
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {glasses * 250}ml / {targetMl}ml
          </p>
        </div>

        <button
          onClick={onAddGlass}
          className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-sm active:scale-95 transition-transform"
          aria-label="Add glass of water"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
