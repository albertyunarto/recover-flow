import Link from "next/link";
import { PiggyBank, ChevronRight, Check, AlertTriangle } from "lucide-react";
import { getFireProfile } from "@/lib/actions/fire";
import { profileToInputs } from "@/lib/fire/defaults";
import { buildSummary } from "@/lib/fire/projection";
import { cn, formatSGD, formatSGDShort } from "@/lib/utils";

// Compact FIRE snapshot for the dashboard. Prompts setup when no plan exists.
export async function FireCard() {
  const profile = await getFireProfile();

  if (!profile) {
    return (
      <Link
        href="/fire"
        className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm active-scale"
      >
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <PiggyBank className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">Plan your FIRE</p>
          <p className="text-xs text-muted-foreground">
            Project CPF LIFE, ETF & RSU savings to retirement
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    );
  }

  const inputs = profileToInputs(profile);
  const summary = buildSummary(inputs);
  const reachable = Number.isFinite(summary.requiredMonthlySavings);

  // Progress toward the invested portfolio needed at retirement.
  const progress = summary.requiredPortfolioAtRetire
    ? Math.min(
        100,
        Math.round(
          (summary.projectedPortfolioAtRetire / summary.requiredPortfolioAtRetire) *
            100
        )
      )
    : 100;

  return (
    <Link
      href="/fire"
      className="block rounded-xl border bg-card p-4 shadow-sm active-scale"
    >
      <div className="flex items-center gap-2 mb-3">
        <PiggyBank className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">FIRE Planner</span>
        <span
          className={cn(
            "ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            summary.onTrack
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
          )}
        >
          {summary.onTrack ? (
            <>
              <Check className="h-3 w-3" /> On track
            </>
          ) : (
            <>
              <AlertTriangle className="h-3 w-3" /> Behind
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground">Retire by</p>
          <p className="text-lg font-bold">{inputs.target_retire_age}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">
            {summary.onTrack ? "You invest" : "Need to save"}
          </p>
          <p className="text-lg font-bold">
            {summary.onTrack
              ? `${formatSGD(inputs.monthly_etf_contribution)}/mo`
              : reachable
                ? `${formatSGD(summary.requiredMonthlySavings)}/mo`
                : "—"}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Toward {formatSGDShort(summary.requiredPortfolioAtRetire)} at retirement</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full",
              summary.onTrack ? "bg-success" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
