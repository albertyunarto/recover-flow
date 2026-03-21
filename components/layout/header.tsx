"use client";

import Link from "next/link";
import { Activity, Settings } from "lucide-react";

const PHASE_COLORS: Record<number, string> = {
  1: "bg-[hsl(221,83%,53%)]",
  2: "bg-[hsl(142,71%,45%)]",
  3: "bg-[hsl(38,92%,50%)]",
  4: "bg-[hsl(262,83%,58%)]",
};

const PHASE_NAMES: Record<number, string> = {
  1: "Foundation",
  2: "Build",
  3: "Advance",
  4: "5K Ready",
};

export function Header({
  phase,
  week,
}: {
  phase: number;
  week: number;
}) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">RecoverFlow</span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`${PHASE_COLORS[phase] || PHASE_COLORS[1]} text-white text-xs font-medium px-2.5 py-1 rounded-full`}
          >
            Phase {phase} &middot; Week {week}
          </div>
          <Link
            href="/settings"
            className="tap-target flex items-center justify-center"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </header>
  );
}
