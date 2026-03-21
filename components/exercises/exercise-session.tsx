"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trophy, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { logExerciseSession } from "@/lib/actions/exercises";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import type {
  ExerciseProtocol,
  ExerciseLog,
  ExerciseCompletion,
} from "@/types";

const PROTOCOL_LABELS: Record<string, string> = {
  cervical: "Cervical",
  elbow: "Elbow",
  core: "Core",
  lower_body: "Lower Body",
  foot: "Foot",
};

interface ExerciseSessionProps {
  protocol: ExerciseProtocol;
  phase: number;
  existingLog: ExerciseLog | null;
}

function buildInitialCompletions(
  protocol: ExerciseProtocol,
  existingLog: ExerciseLog | null
): ExerciseCompletion[] {
  const logMap = Object.fromEntries(
    (existingLog?.exercises ?? []).map((e) => [e.id, e])
  );

  return protocol.exercises.map((ex) => {
    const existing = logMap[ex.id];
    if (existing) return existing;
    return {
      id: ex.id,
      name: ex.name,
      sets_completed: 0,
      total_sets: ex.sets,
      skipped: false,
      notes: undefined,
    };
  });
}

export function ExerciseSession({
  protocol,
  phase,
  existingLog,
}: ExerciseSessionProps) {
  const router = useRouter();
  const [completions, setCompletions] = useState<ExerciseCompletion[]>(() =>
    buildInitialCompletions(protocol, existingLog)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [startTime] = useState(() => Date.now());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionsRef = useRef(completions);
  completionsRef.current = completions;

  const totalExercises = completions.length;
  const completedCount = completions.filter(
    (c) => !c.skipped && c.sets_completed >= c.total_sets
  ).length;
  const skippedCount = completions.filter((c) => c.skipped).length;
  const doneCount = completedCount + skippedCount;
  const allDone = doneCount >= totalExercises;
  const progressPct =
    totalExercises > 0
      ? Math.round((completedCount / totalExercises) * 100)
      : 0;

  const save = useCallback(
    async (latestCompletions: ExerciseCompletion[]) => {
      setIsSaving(true);
      const elapsedMinutes = Math.round((Date.now() - startTime) / 60000);
      await logExerciseSession({
        protocol: protocol.protocol,
        exercises: latestCompletions,
        phase,
        duration_minutes: elapsedMinutes > 0 ? elapsedMinutes : undefined,
      });
      setIsSaving(false);
    },
    [protocol.protocol, phase, startTime]
  );

  const scheduleSave = useCallback(
    (updatedCompletions: ExerciseCompletion[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        save(updatedCompletions);
      }, 800);
    },
    [save]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSetComplete(exerciseId: string, setIndex: number) {
    setCompletions((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== exerciseId) return c;
        // sets are 0-indexed clicks, so completing set at setIndex means sets_completed = setIndex + 1
        const newCompleted = Math.max(c.sets_completed, setIndex + 1);
        return { ...c, sets_completed: newCompleted };
      });
      scheduleSave(updated);
      return updated;
    });
  }

  function handleSkip(exerciseId: string, note?: string) {
    setCompletions((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== exerciseId) return c;
        return { ...c, skipped: true, sets_completed: 0, notes: note };
      });
      scheduleSave(updated);
      return updated;
    });
  }

  function handleUnskip(exerciseId: string) {
    setCompletions((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== exerciseId) return c;
        return { ...c, skipped: false, notes: undefined };
      });
      scheduleSave(updated);
      return updated;
    });
  }

  const protocolLabel = PROTOCOL_LABELS[protocol.protocol] ?? protocol.protocol;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/exercises"
          className="flex items-center justify-center rounded-lg border p-2 hover:bg-muted transition-colors active-scale"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">
            {protocolLabel} Protocol
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>~{protocol.duration_minutes} min</span>
          </div>
        </div>
        {isSaving && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Saving…
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            {completedCount} of {totalExercises} exercises done
          </span>
          <span
            className={cn(
              "text-sm font-semibold",
              allDone ? "text-green-600" : "text-primary"
            )}
          >
            {progressPct}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              allDone ? "bg-green-500" : "bg-primary"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {skippedCount > 0 && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {skippedCount} skipped
          </p>
        )}
      </div>

      {/* Celebration */}
      {allDone && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 p-5 text-center shadow-sm">
          <Trophy className="mx-auto mb-2 h-10 w-10 text-yellow-500" />
          <h2 className="text-lg font-bold text-green-700 dark:text-green-400">
            Session Complete!
          </h2>
          <p className="text-sm text-green-600/80 dark:text-green-500/80 mt-1">
            Great work finishing your {protocolLabel.toLowerCase()} exercises.
          </p>
          <Link
            href="/exercises"
            className="mt-4 inline-block rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors active-scale"
          >
            Back to exercises
          </Link>
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-3">
        {protocol.exercises.map((exercise) => {
          const completion = completions.find((c) => c.id === exercise.id)!;
          return (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              completion={completion}
              onSetComplete={(setIndex) =>
                handleSetComplete(exercise.id, setIndex)
              }
              onSkip={(note) => handleSkip(exercise.id, note)}
              onUnskip={() => handleUnskip(exercise.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
