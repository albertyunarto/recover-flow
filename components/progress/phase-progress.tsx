"use client";

import { cn } from "@/lib/utils";

interface PhaseProgressProps {
  currentPhase: number;
  currentWeek?: number;
}

const PHASES = [
  { number: 1, name: "Foundation", weekRange: [1, 6] as [number, number], color: "#2563eb" },
  { number: 2, name: "Build", weekRange: [7, 12] as [number, number], color: "#16a34a" },
  { number: 3, name: "Advance", weekRange: [13, 18] as [number, number], color: "#f59e0b" },
  { number: 4, name: "5K Ready", weekRange: [19, 24] as [number, number], color: "#7c3aed" },
];

export function PhaseProgress({ currentPhase, currentWeek }: PhaseProgressProps) {
  return (
    <div className="space-y-2">
      {/* Phase segments */}
      <div className="flex gap-1.5">
        {PHASES.map((phase) => {
          const isActive = phase.number === currentPhase;
          const isCompleted = phase.number < currentPhase;
          const totalWeeks = phase.weekRange[1] - phase.weekRange[0] + 1;

          let weekProgress = 0;
          if (isActive && currentWeek !== undefined) {
            const weekInPhase = currentWeek - phase.weekRange[0] + 1;
            weekProgress = Math.min(100, Math.max(0, (weekInPhase / totalWeeks) * 100));
          }

          return (
            <div key={phase.number} className="flex-1">
              {/* Progress bar */}
              <div
                className="h-2.5 rounded-full overflow-hidden relative"
                style={{
                  backgroundColor: isActive
                    ? `${phase.color}22`
                    : isCompleted
                    ? phase.color
                    : "hsl(210 40% 96%)",
                }}
              >
                {isActive && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{
                      width: `${weekProgress}%`,
                      backgroundColor: phase.color,
                    }}
                  />
                )}
                {isCompleted && (
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: phase.color }}
                  />
                )}
              </div>

              {/* Labels */}
              <div className="mt-1.5 text-center">
                <p
                  className={cn(
                    "text-[10px] font-semibold leading-tight transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                  style={isActive ? { color: phase.color } : undefined}
                >
                  {phase.name}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  W{phase.weekRange[0]}–{phase.weekRange[1]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {currentWeek !== undefined && (
        <p className="text-[10px] text-muted-foreground text-center">
          Phase {currentPhase} · Week {currentWeek} of 24
        </p>
      )}
    </div>
  );
}
