"use client";

import { useState, useTransition } from "react";
import { Check, Footprints, X } from "lucide-react";
import {
  confirmImportedExercise,
  dismissImportedExercise,
  type ReconcileCandidate,
} from "@/lib/actions/imported-exercises";

export function ExerciseReconcileList({
  candidates,
  currentPhase,
}: {
  candidates: ReconcileCandidate[];
  currentPhase: number;
}) {
  const [items, setItems] = useState(candidates);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (items.length === 0) return null;

  function remove(id: string) {
    setItems((prev) => prev.filter((c) => c.exercise.id !== id));
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Footprints className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Found on your Fitbit</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        These runs and walks came from your import. Confirm to log them as run
        sessions, or dismiss ones that aren&apos;t part of your plan.
      </p>
      <ul className="space-y-2">
        {items.map(({ exercise, suggestedWeek, suggestedFormat }) => {
          const date = new Date(exercise.started_at).toLocaleDateString(
            "en-US",
            { weekday: "short", month: "short", day: "numeric" }
          );
          return (
            <li
              key={exercise.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {exercise.activity_type} · {date}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[
                    exercise.duration_min && `${exercise.duration_min} min`,
                    exercise.distance_km && `${exercise.distance_km} km`,
                    exercise.avg_hr && `avg HR ${exercise.avg_hr}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  {suggestedWeek && (
                    <span className="text-primary">
                      {" "}
                      · matches Week {suggestedWeek}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending && busyId === exercise.id}
                onClick={() => {
                  setBusyId(exercise.id);
                  startTransition(async () => {
                    await confirmImportedExercise(
                      exercise.id,
                      suggestedWeek ?? 0,
                      currentPhase,
                      suggestedFormat ?? exercise.activity_type
                    );
                    remove(exercise.id);
                  });
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                aria-label="Confirm as run session"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={isPending && busyId === exercise.id}
                onClick={() => {
                  setBusyId(exercise.id);
                  startTransition(async () => {
                    await dismissImportedExercise(exercise.id);
                    remove(exercise.id);
                  });
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-muted disabled:opacity-50"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
