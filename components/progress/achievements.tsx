import {
  Dumbbell,
  Flame,
  Trophy,
  Shield,
  Hand,
  Timer,
  Footprints,
  ClipboardCheck,
  ArrowUpCircle,
  Crown,
  Lock,
  type LucideIcon,
} from "lucide-react";
import type { Achievement } from "@/lib/gamification";

const ICONS: Record<string, LucideIcon> = {
  Dumbbell,
  Flame,
  Trophy,
  Shield,
  Hand,
  Timer,
  Footprints,
  ClipboardCheck,
  ArrowUpCircle,
  Crown,
};

export function Achievements({
  achievements,
  unlockedCount,
}: {
  achievements: Achievement[];
  unlockedCount: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Achievements</h2>
        <span className="text-xs text-muted-foreground">
          {unlockedCount}/{achievements.length} unlocked
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {achievements.map((a) => {
          const Icon = a.unlocked ? ICONS[a.icon] ?? Trophy : Lock;
          return (
            <div
              key={a.id}
              title={`${a.name} — ${a.description}`}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors ${
                a.unlocked
                  ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
                  : "border-dashed bg-muted/30 opacity-70"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  a.unlocked ? "text-amber-500" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-semibold leading-tight ${
                  a.unlocked ? "" : "text-muted-foreground"
                }`}
              >
                {a.name}
              </span>
              <span className="text-[9px] leading-tight text-muted-foreground line-clamp-2">
                {a.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
