import Link from "next/link";
import { Apple } from "lucide-react";
import type { NutritionEntry } from "@/types";

function ProgressRing({
  current,
  target,
  color,
  label,
  unit,
}: {
  current: number;
  target: number;
  color: string;
  label: string;
  unit: string;
}) {
  const pct = Math.min((current / target) * 100, 100);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-muted"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold">{Math.round(pct)}%</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-medium">
          {current}/{target}
          {unit}
        </div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export function NutritionSummaryCard({
  entries,
  calorieTarget,
  proteinTarget,
}: {
  entries: NutritionEntry[];
  calorieTarget: number;
  proteinTarget: number;
}) {
  const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);
  const totalProtein = entries.reduce((sum, e) => sum + e.protein_g, 0);

  return (
    <Link
      href="/nutrition"
      className="block rounded-xl border bg-card p-4 shadow-sm active-scale"
    >
      <div className="flex items-center gap-2 mb-3">
        <Apple className="h-4 w-4 text-success" />
        <span className="text-sm font-medium">Nutrition</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {entries.length} meal{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      {entries.length > 0 ? (
        <div className="flex justify-around">
          <ProgressRing
            current={totalCalories}
            target={calorieTarget}
            color="hsl(221, 83%, 53%)"
            label="Calories"
            unit="kcal"
          />
          <ProgressRing
            current={totalProtein}
            target={proteinTarget}
            color="hsl(142, 71%, 45%)"
            label="Protein"
            unit="g"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Tap to log a meal</p>
      )}
    </Link>
  );
}
