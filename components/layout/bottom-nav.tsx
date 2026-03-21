"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  Apple,
  Timer,
  TrendingUp,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/exercises", label: "Exercise", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/run", label: "Run", icon: Timer, phaseGated: 2 },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

export function BottomNav({ currentPhase }: { currentPhase: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div
        className="flex items-center justify-around h-16 max-w-2xl mx-auto"
        style={{ paddingBottom: "var(--safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map((item) => {
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
                "flex flex-col items-center justify-center gap-1 tap-target px-2 transition-colors",
                isActive
                  ? "text-primary"
                  : isLocked
                    ? "text-muted-foreground/40"
                    : "text-muted-foreground hover:text-foreground"
              )}
              aria-disabled={isLocked}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {isLocked && (
                  <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1" />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
