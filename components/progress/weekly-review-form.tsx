"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReview, advancePhase } from "@/lib/actions/weekly-review";
import {
  TrendingDown,
  TrendingUp,
  Minus,
  CheckCircle2,
  Circle,
  ChevronsUp,
} from "lucide-react";
import type { WeeklyStats, GateCriterion } from "@/types";
import { LEVELS } from "@/lib/gamification";

const TREND_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const TREND_COLORS = {
  up: "text-destructive",
  down: "text-success",
  stable: "text-muted-foreground",
};

export function WeeklyReviewForm({
  stats,
  weekNumber,
  phase,
  gateCriteria,
  alreadyCompleted,
}: {
  stats: WeeklyStats;
  weekNumber: number;
  phase: number;
  gateCriteria: Omit<GateCriterion, "met">[];
  alreadyCompleted: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [manualGates, setManualGates] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const regions = [
    { key: "neck" as const, label: "Neck" },
    { key: "back" as const, label: "Back" },
    { key: "elbow" as const, label: "Elbow" },
    { key: "knee" as const, label: "Knee" },
  ];

  function toggleGate(id: string) {
    setManualGates((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Check auto gates
  function isGateMet(criterion: Omit<GateCriterion, "met">): boolean {
    if (criterion.type === "manual") return manualGates[criterion.id] ?? false;

    // Auto checks
    if (criterion.id === "pain_threshold") {
      return (
        stats.avg_pain.neck <= 3 &&
        stats.avg_pain.back <= 3 &&
        stats.avg_pain.elbow <= 3 &&
        stats.avg_pain.knee <= 3
      );
    }
    if (criterion.id === "elbow_daily") {
      return stats.avg_pain.elbow <= 2;
    }
    if (criterion.id === "weight") {
      return (stats.weight_kg ?? 999) <= 82;
    }
    return false;
  }

  const allGatesMet = gateCriteria.every((c) => isGateMet(c));

  function handleSubmit() {
    const gates: GateCriterion[] = gateCriteria.map((c) => ({
      ...c,
      met: isGateMet(c),
    }));

    const formData = new FormData();
    formData.set("week_number", String(weekNumber));
    formData.set("phase", String(phase));
    formData.set("notes", notes);
    formData.set("gate_criteria", JSON.stringify(gates));

    startTransition(async () => {
      await submitReview(formData);
      router.refresh();
    });
  }

  function handleAdvance() {
    startTransition(async () => {
      await advancePhase();
      router.push("/dashboard");
    });
  }

  return (
    <div className="space-y-4">
      {alreadyCompleted && (
        <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success font-medium">
          Week {weekNumber} review completed
        </div>
      )}

      {/* Pain Summary */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold">Pain (Weekly Average)</h3>
        <div className="grid grid-cols-2 gap-3">
          {regions.map((r) => {
            const score = stats.avg_pain[r.key];
            const trend = stats.pain_trends[r.key];
            const TrendIcon = TREND_ICONS[trend];
            return (
              <div key={r.key} className="flex items-center justify-between">
                <span className="text-sm">{r.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold">{score.toFixed(1)}</span>
                  <TrendIcon
                    className={`h-3.5 w-3.5 ${TREND_COLORS[trend]}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exercise & Nutrition */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Exercise Adherence</p>
          <p className="text-2xl font-bold">
            {stats.exercise_adherence_pct}%
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Run Minutes</p>
          <p className="text-2xl font-bold">{stats.total_run_minutes}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Avg Calories</p>
          <p className="text-2xl font-bold">{stats.avg_daily_calories}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Avg Protein</p>
          <p className="text-2xl font-bold">{stats.avg_daily_protein}g</p>
        </div>
      </div>

      {/* Weight */}
      {stats.weight_kg !== null && (
        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Weight</p>
            <p className="text-2xl font-bold">{stats.weight_kg} kg</p>
          </div>
          {stats.weight_change_kg !== null && (
            <div
              className={`text-sm font-medium ${
                stats.weight_change_kg < 0
                  ? "text-success"
                  : stats.weight_change_kg > 0
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {stats.weight_change_kg > 0 ? "+" : ""}
              {stats.weight_change_kg} kg
            </div>
          )}
        </div>
      )}

      {/* Level-Up Challenges */}
      {gateCriteria.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <ChevronsUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">
              Level {phase} → {phase + 1}
              {LEVELS[phase] ? `: ${LEVELS[phase].name}` : ""} Challenges
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Tap each manual challenge once it&apos;s true. Auto-checks read from your
            logged data. Clear them all to unlock the next level.
          </p>
          <div className="space-y-2">
            {gateCriteria.map((c) => {
              const met = isGateMet(c);
              return (
                <button
                  key={c.id}
                  onClick={() => c.type === "manual" && toggleGate(c.id)}
                  className={`flex items-center gap-2 w-full text-left p-2 rounded-lg transition-colors ${
                    c.type === "manual"
                      ? "hover:bg-muted cursor-pointer"
                      : "cursor-default"
                  }`}
                >
                  {met ? (
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-sm">{c.label}</span>
                  {c.type === "auto" && (
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      auto
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Weekly Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How was this week? Any adjustments needed?"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
        />
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={handleSubmit}
          disabled={isPending || alreadyCompleted}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-primary-foreground font-medium active:scale-95 disabled:opacity-50"
        >
          {isPending ? "Saving..." : `Complete Week ${weekNumber}`}
        </button>

        {allGatesMet && phase < 4 && (
          <button
            onClick={handleAdvance}
            disabled={isPending}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-streak text-streak-foreground font-bold shadow-md active:scale-95 disabled:opacity-50"
          >
            <ChevronsUp className="h-5 w-5" />
            Level Up to Level {phase + 1}
            {LEVELS[phase] ? `: ${LEVELS[phase].name}` : ""}
          </button>
        )}

        {!allGatesMet && phase < 4 && (
          <p className="text-center text-xs text-muted-foreground">
            Clear all Level {phase} → {phase + 1} challenges above to unlock the
            Level Up button.
          </p>
        )}
      </div>
    </div>
  );
}
