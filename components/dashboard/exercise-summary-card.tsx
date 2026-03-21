import Link from "next/link";
import { Dumbbell, Flame } from "lucide-react";
import { getAdherenceColor } from "@/lib/utils";
import type { ExerciseLog } from "@/types";

export function ExerciseSummaryCard({
  logs,
  streak,
}: {
  logs: ExerciseLog[];
  streak: number;
}) {
  const totalExercises = logs.reduce((sum, l) => sum + l.total_exercises, 0);
  const completedExercises = logs.reduce(
    (sum, l) => sum + l.completed_count,
    0
  );
  const pct =
    totalExercises > 0
      ? Math.round((completedExercises / totalExercises) * 100)
      : 0;

  return (
    <Link
      href="/exercises"
      className="block rounded-xl border bg-card p-4 shadow-sm active-scale"
    >
      <div className="flex items-center gap-2 mb-3">
        <Dumbbell className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Exercises</span>
        {streak > 0 && (
          <div className="ml-auto flex items-center gap-1 text-streak">
            <Flame className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">{streak}</span>
          </div>
        )}
      </div>

      {logs.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${getAdherenceColor(pct)}`}>
              {pct}%
            </span>
            <span className="text-xs text-muted-foreground">today</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {completedExercises}/{totalExercises} exercises &middot;{" "}
            {logs.length} protocol{logs.length !== 1 ? "s" : ""}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No exercises logged today
        </p>
      )}
    </Link>
  );
}
