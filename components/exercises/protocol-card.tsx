import Link from "next/link";
import {
  Activity,
  Hand,
  Target,
  Footprints,
  PersonStanding,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExerciseProtocol, ExerciseLog, ProtocolType } from "@/types";

const PROTOCOL_META: Record<
  ProtocolType,
  { label: string; Icon: React.ElementType; color: string; bgColor: string }
> = {
  cervical: {
    label: "Cervical",
    Icon: Activity,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  elbow: {
    label: "Elbow",
    Icon: Hand,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
  },
  core: {
    label: "Core",
    Icon: Target,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  lower_body: {
    label: "Lower Body",
    Icon: Footprints,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
  },
  foot: {
    label: "Foot",
    Icon: PersonStanding,
    color: "text-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
  },
};

interface ProtocolCardProps {
  protocol: ExerciseProtocol;
  log: ExerciseLog | null;
}

export function ProtocolCard({ protocol, log }: ProtocolCardProps) {
  const meta = PROTOCOL_META[protocol.protocol];
  const { Icon, label, color, bgColor } = meta;

  const totalExercises = protocol.exercises.length;
  const completedCount = log?.completed_count ?? 0;
  const isComplete = log != null && completedCount >= totalExercises;
  const hasStarted = log != null && completedCount > 0;
  const progressPct =
    totalExercises > 0
      ? Math.round((completedCount / totalExercises) * 100)
      : 0;

  return (
    <Link href={`/exercises/${protocol.protocol}`} className="block active-scale">
      <div
        className={cn(
          "rounded-xl border bg-card p-4 shadow-sm transition-colors",
          isComplete && "border-green-200 dark:border-green-800"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={cn("rounded-lg p-2.5 shrink-0", bgColor)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm">{label}</span>
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span>{totalExercises} exercises</span>
              <span>·</span>
              <Clock className="h-3 w-3" />
              <span>~{protocol.duration_minutes} min</span>
            </div>

            {/* Progress bar */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  {hasStarted || isComplete
                    ? `${completedCount}/${totalExercises} done`
                    : "Not started"}
                </span>
                {(hasStarted || isComplete) && (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isComplete ? "text-green-600" : "text-foreground"
                    )}
                  >
                    {progressPct}%
                  </span>
                )}
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isComplete ? "bg-green-500" : "bg-primary"
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
