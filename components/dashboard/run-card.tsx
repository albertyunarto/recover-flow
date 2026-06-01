import Link from "next/link";
import { Timer, Lock } from "lucide-react";

export function RunCard({
  currentPhase,
  currentWeek,
}: {
  currentPhase: number;
  currentWeek: number;
}) {
  const isLocked = currentPhase < 2;

  if (isLocked) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm opacity-60">
        <div className="flex items-center gap-2 mb-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Run Program
          </span>
          <Lock className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">
          Light running unlocks at Level 2 — reload your strength first
        </p>
      </div>
    );
  }

  return (
    <Link
      href="/run"
      className="block rounded-xl border bg-card p-4 shadow-sm active-scale"
    >
      <div className="flex items-center gap-2 mb-2">
        <Timer className="h-4 w-4 text-streak" />
        <span className="text-sm font-medium">Run Program</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Week {currentWeek} — Tap to see today&apos;s intervals
      </p>
    </Link>
  );
}
