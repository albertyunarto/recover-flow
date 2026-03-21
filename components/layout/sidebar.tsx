"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  Apple,
  Timer,
  TrendingUp,
  BookOpen,
  HeartPulse,
  Settings,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plan", label: "My Plan", icon: BookOpen },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/pain", label: "Pain Tracker", icon: HeartPulse },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/run", label: "Run Program", icon: Timer, phaseGated: 2 },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ currentPhase }: { currentPhase: number }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 md:top-14 border-r bg-background">
      <nav className="flex-1 space-y-1 px-3 py-4">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const isLocked =
            item.phaseGated !== undefined && currentPhase < item.phaseGated;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={isLocked ? "#" : item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : isLocked
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {isLocked && <Lock className="h-3 w-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
