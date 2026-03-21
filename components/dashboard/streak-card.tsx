import { Flame, Trophy } from "lucide-react";

export function StreakCard({ streak }: { streak: number }) {
  const flameSize =
    streak >= 14 ? "h-8 w-8" : streak >= 7 ? "h-6 w-6" : "h-5 w-5";

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-streak" />
        <span className="text-sm font-medium">Streak</span>
      </div>

      <div className="flex items-center gap-2">
        {streak > 0 ? (
          <>
            <Flame className={`${flameSize} text-streak`} />
            <div>
              <span className="text-2xl font-bold text-streak">{streak}</span>
              <span className="text-xs text-muted-foreground ml-1">
                day{streak !== 1 ? "s" : ""}
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Complete exercises to start a streak
          </p>
        )}
      </div>
    </div>
  );
}
