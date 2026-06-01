import Link from "next/link";
import { CheckCircle2, Lock, Circle, ChevronRight } from "lucide-react";
import { LEVELS, type NextLevelInfo } from "@/lib/gamification";

export function LevelJourney({
  currentLevel,
  currentWeek,
  nextLevel,
}: {
  currentLevel: number;
  currentWeek: number;
  nextLevel: NextLevelInfo | null;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recovery Journey</h2>
        <span className="text-xs text-muted-foreground">Week {currentWeek} of 16</span>
      </div>

      <div className="space-y-1">
        {LEVELS.map((lvl, idx) => {
          const isDone = lvl.number < currentLevel;
          const isCurrent = lvl.number === currentLevel;
          const isLocked = lvl.number > currentLevel;
          const isLast = idx === LEVELS.length - 1;

          return (
            <div key={lvl.number} className="flex gap-3">
              {/* Rail */}
              <div className="flex flex-col items-center">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white shrink-0"
                  style={{
                    backgroundColor: isLocked ? undefined : lvl.color,
                    background: isLocked ? "hsl(210 40% 92%)" : undefined,
                  }}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isCurrent ? (
                    <Circle className="h-5 w-5 fill-white/30" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className="w-0.5 flex-1 my-1"
                    style={{
                      minHeight: isCurrent ? 64 : 24,
                      backgroundColor: isDone ? lvl.color : "hsl(210 40% 90%)",
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-bold"
                    style={isCurrent ? { color: lvl.color } : undefined}
                  >
                    Level {lvl.number}: {lvl.name}
                  </span>
                  {isCurrent && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: lvl.color }}
                    >
                      You are here
                    </span>
                  )}
                  {isDone && (
                    <span className="text-[10px] font-medium text-success">Cleared</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{lvl.tagline}</p>

                {/* Next-level challenges shown under the current level */}
                {isCurrent && nextLevel && (
                  <div className="mt-2 rounded-lg bg-muted/40 p-3 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Level up to {nextLevel.name} — clear these
                    </p>
                    <ul className="space-y-1">
                      {nextLevel.criteria.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-start gap-1.5 text-xs text-foreground"
                        >
                          <Circle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                          <span>{c.label}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/progress/review"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary active-scale"
                    >
                      Check them in your Weekly Review
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}

                {isCurrent && !nextLevel && (
                  <p className="mt-1 text-xs font-medium text-success">
                    🏆 Final level reached — keep maintaining your strength!
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
