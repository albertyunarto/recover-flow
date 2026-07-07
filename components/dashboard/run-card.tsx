import Link from "next/link";
import { Timer, Lock } from "lucide-react";
import type { ReadinessVerdict } from "@/types";

export function RunCard({
  currentPhase,
  currentWeek,
  verdict,
}: {
  currentPhase: number;
  currentWeek: number;
  /** Fresh readiness verdict; adjusts the suggestion (never increases load) */
  verdict?: ReadinessVerdict | null;
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
        {verdict === "amber" && (
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
            Hold
          </span>
        )}
        {verdict === "red" && (
          <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
            Back off
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {verdict === "amber"
          ? `Amber readiness — repeat Week ${Math.max(1, currentWeek - 1)}'s session instead of progressing`
          : verdict === "red"
          ? "Red readiness — skip the run today, mobility only"
          : `Week ${currentWeek} — Tap to see today's intervals`}
      </p>
    </Link>
  );
}
