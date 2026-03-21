"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Exercise, ExerciseCompletion } from "@/types";

type CardState = "incomplete" | "in_progress" | "complete" | "skipped";

interface ExerciseCardProps {
  exercise: Exercise;
  completion: ExerciseCompletion;
  onSetComplete: (setIndex: number) => void;
  onSkip: (note?: string) => void;
  onUnskip: () => void;
}

function formatExerciseSpec(exercise: Exercise): string {
  const parts: string[] = [];
  parts.push(`${exercise.sets} × ${exercise.reps} reps`);
  if (exercise.hold_sec > 0) {
    parts.push(`hold ${exercise.hold_sec}s`);
  }
  return parts.join(", ");
}

export function ExerciseCard({
  exercise,
  completion,
  onSetComplete,
  onSkip,
  onUnskip,
}: ExerciseCardProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [skipMode, setSkipMode] = useState(false);
  const [skipNote, setSkipNote] = useState("");

  const setsCompleted = completion.sets_completed;
  const totalSets = completion.total_sets;
  const isSkipped = completion.skipped;
  const isComplete = !isSkipped && setsCompleted >= totalSets;
  const isInProgress = !isSkipped && setsCompleted > 0 && setsCompleted < totalSets;

  let cardState: CardState = "incomplete";
  if (isSkipped) cardState = "skipped";
  else if (isComplete) cardState = "complete";
  else if (isInProgress) cardState = "in_progress";

  function handleSkipConfirm() {
    onSkip(skipNote.trim() || undefined);
    setSkipMode(false);
    setSkipNote("");
  }

  function handleSkipCancel() {
    setSkipMode(false);
    setSkipNote("");
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm transition-all duration-200",
        cardState === "complete" && "border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-950/10",
        cardState === "skipped" && "border-muted opacity-60",
        cardState === "in_progress" && "border-primary/30"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {cardState === "complete" && (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            )}
            {cardState === "skipped" && (
              <X className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <h3
              className={cn(
                "font-semibold text-sm leading-tight",
                cardState === "skipped" && "line-through text-muted-foreground"
              )}
            >
              {exercise.name}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatExerciseSpec(exercise)}
          </p>
        </div>

        {/* Skip / Unskip */}
        {!isComplete && (
          <button
            onClick={() => (isSkipped ? onUnskip() : setSkipMode(!skipMode))}
            className={cn(
              "text-xs px-2 py-1 rounded-md border transition-colors shrink-0",
              isSkipped
                ? "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                : "border-muted-foreground/20 text-muted-foreground hover:border-destructive hover:text-destructive"
            )}
          >
            {isSkipped ? "Undo skip" : "Skip"}
          </button>
        )}
      </div>

      {/* Skip mode */}
      {skipMode && (
        <div className="mb-3 space-y-2 rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground font-medium">
            Reason for skipping? (optional)
          </p>
          <input
            type="text"
            value={skipNote}
            onChange={(e) => setSkipNote(e.target.value)}
            placeholder="e.g. Pain increased, will try tomorrow"
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSkipConfirm();
              if (e.key === "Escape") handleSkipCancel();
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSkipConfirm}
              className="flex-1 rounded-md bg-muted-foreground/10 px-3 py-1.5 text-xs font-medium hover:bg-muted-foreground/20 transition-colors"
            >
              Skip exercise
            </button>
            <button
              onClick={handleSkipCancel}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Form cue */}
      {!isSkipped && (
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          {exercise.form_cue}
        </p>
      )}

      {/* Skip note */}
      {isSkipped && completion.notes && (
        <p className="text-xs text-muted-foreground italic mb-3">
          Note: {completion.notes}
        </p>
      )}

      {/* Set tracker */}
      {!isSkipped && (
        <div className="flex gap-2 flex-wrap mb-3">
          {Array.from({ length: totalSets }).map((_, i) => {
            const isDone = i < setsCompleted;
            return (
              <button
                key={i}
                onClick={() => !isDone && onSetComplete(i)}
                disabled={isDone}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 active-scale min-w-[72px] justify-center",
                  isDone
                    ? "bg-green-500 text-white cursor-default"
                    : "border border-muted-foreground/20 bg-background text-muted-foreground hover:border-primary hover:text-primary active:scale-95"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : null}
                Set {i + 1}
                {isDone ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      )}

      {/* Why section */}
      <button
        onClick={() => setWhyOpen(!whyOpen)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="h-3.5 w-3.5" />
        <span>Why this exercise?</span>
        {whyOpen ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {whyOpen && (
        <div className="mt-2 rounded-lg bg-muted/40 px-3 py-2.5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {exercise.why}
          </p>
        </div>
      )}
    </div>
  );
}
