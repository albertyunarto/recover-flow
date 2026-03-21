import Link from "next/link";
import { HeartPulse, Apple, Timer, Dumbbell, Lock } from "lucide-react";

const ACTIONS = [
  {
    href: "/pain/log",
    label: "Log Pain",
    icon: HeartPulse,
    color: "bg-destructive/10 text-destructive",
  },
  {
    href: "/nutrition/log",
    label: "Log Meal",
    icon: Apple,
    color: "bg-success/10 text-success",
  },
  {
    href: "/exercises",
    label: "Exercise",
    icon: Dumbbell,
    color: "bg-primary/10 text-primary",
  },
  {
    href: "/run/session",
    label: "Start Run",
    icon: Timer,
    color: "bg-streak/10 text-streak",
    phaseGated: 2,
  },
];

export function QuickActions({ currentPhase }: { currentPhase: number }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {ACTIONS.map((action) => {
        const isLocked =
          action.phaseGated !== undefined && currentPhase < action.phaseGated;
        const Icon = action.icon;

        return (
          <Link
            key={action.href}
            href={isLocked ? "#" : action.href}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all active:scale-95 ${
              isLocked ? "opacity-40 cursor-not-allowed" : ""
            } ${action.color}`}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {isLocked && (
                <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1.5" />
              )}
            </div>
            <span className="text-[10px] font-medium">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
