import Link from "next/link";
import { Activity, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReadinessStatus } from "@/lib/actions/readiness";

const VERDICT_STYLES = {
  green: {
    label: "Green — go",
    ring: "text-success border-success",
    badge: "bg-success/10 text-success",
    advice: "Progress as planned — your body is ready for today's session.",
  },
  amber: {
    label: "Amber — hold",
    ring: "text-amber-500 border-amber-500",
    badge: "bg-amber-500/10 text-amber-600",
    advice: "Hold this week's load — repeat last week's session instead of progressing.",
  },
  red: {
    label: "Red — back off",
    ring: "text-destructive border-destructive",
    badge: "bg-destructive/10 text-destructive",
    advice: "Swap today for a mobility-only day and let recovery catch up.",
  },
} as const;

const COMPONENT_LABELS: Record<string, string> = {
  sleep: "Sleep",
  rhr: "Resting HR",
  hrv: "HRV",
  load: "Load",
};

export function ReadinessCard({ status }: { status: ReadinessStatus }) {
  const { readiness, latestMetricsDate, staleDays } = status;

  if (!readiness) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Recovery Readiness</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {latestMetricsDate ? (
            <>
              Not enough history yet — readiness needs ~2 weeks of sleep and
              resting-HR data. Keep importing weekly.
            </>
          ) : (
            <>
              Import your Fitbit data to get a daily train / hold / back-off
              verdict.{" "}
              <Link href="/settings/import" className="text-primary underline">
                Import now
              </Link>
            </>
          )}
        </p>
      </div>
    );
  }

  const style = VERDICT_STYLES[readiness.verdict];
  const isStale = (staleDays ?? 0) > 2;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Recovery Readiness</span>
        <span
          className={cn(
            "ml-auto text-xs font-semibold px-2 py-0.5 rounded-full",
            style.badge
          )}
        >
          {style.label}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4",
            style.ring
          )}
        >
          <span className="text-xl font-bold">{readiness.score}</span>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          {Object.entries(readiness.components).map(([key, c]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-20 text-xs text-muted-foreground shrink-0">
                {COMPONENT_LABELS[key] ?? key}
              </span>
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, (c.pts / c.max) * 100)}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
                {c.pts}/{c.max}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm">{style.advice}</p>

      {isStale && (
        <div className="flex items-start gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Based on data from {readiness.date} ({staleDays} days ago).{" "}
            <Link href="/settings/import" className="text-primary underline">
              Import a fresh export
            </Link>{" "}
            for today&apos;s verdict.
          </span>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Training-load guidance only, not medical advice. See a professional
        about pain or illness.
      </p>
    </div>
  );
}
