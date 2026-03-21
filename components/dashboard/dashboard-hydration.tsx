"use client";

import { useTransition } from "react";
import { logWater } from "@/lib/actions/hydration";
import { HydrationCard } from "./hydration-card";
import type { HydrationLog } from "@/types";

export function DashboardHydration({
  log,
  targetMl,
}: {
  log: HydrationLog | null;
  targetMl: number;
}) {
  const [isPending, startTransition] = useTransition();

  function handleAddGlass() {
    startTransition(async () => {
      await logWater();
    });
  }

  return (
    <div className={isPending ? "opacity-70 pointer-events-none" : ""}>
      <HydrationCard log={log} targetMl={targetMl} onAddGlass={handleAddGlass} />
    </div>
  );
}
