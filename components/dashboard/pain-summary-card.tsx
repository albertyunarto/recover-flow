import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { getPainColor } from "@/lib/utils";
import type { PainEntry } from "@/types";

const REGIONS = [
  { key: "neck_score" as const, label: "Neck" },
  { key: "back_score" as const, label: "Back" },
  { key: "elbow_score" as const, label: "Elbow" },
  { key: "knee_score" as const, label: "Knee" },
];

export function PainSummaryCard({ entries }: { entries: PainEntry[] }) {
  const latest = entries.length > 0 ? entries[entries.length - 1] : null;

  return (
    <Link
      href="/pain/log"
      className="block rounded-xl border bg-card p-4 shadow-sm active-scale"
    >
      <div className="flex items-center gap-2 mb-3">
        <HeartPulse className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium">Pain</span>
        {latest && (
          <span className="ml-auto text-xs text-muted-foreground">
            {latest.time_of_day}
          </span>
        )}
      </div>

      {latest ? (
        <div className="grid grid-cols-2 gap-2">
          {REGIONS.map((region) => {
            const score = latest[region.key];
            return (
              <div key={region.key} className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground w-10">
                  {region.label}
                </span>
                <span
                  className={`text-lg font-bold ${getPainColor(score ?? 0)}`}
                >
                  {score ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Tap to log pain</p>
      )}
    </Link>
  );
}
