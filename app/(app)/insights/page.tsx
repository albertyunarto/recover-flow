import { redirect } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { getAuthUser } from "@/lib/supabase/auth";
import { getInsights } from "@/lib/actions/insights";
import { CorrelationChart } from "@/components/charts/correlation-chart";
import { MIN_N } from "@/lib/correlation";

export const metadata = { title: "Recovery Insights | RecoverFlow" };

export default async function InsightsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  const { insights, overlay, metricsDays, painDays } = await getInsights();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Recovery Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">
          How your sleep, resting heart rate, training load, and stress line up
          with your pain. Observations, not diagnoses — bring them to your
          physio.
        </p>
      </div>

      <CorrelationChart overlay={overlay} />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Patterns worth noticing</h2>
        </div>

        {insights.length === 0 ? (
          <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            {metricsDays === 0 || painDays === 0 ? (
              <>
                Once you&apos;ve imported Fitbit data and logged pain over the
                same period, patterns show up here.
              </>
            ) : (
              <>
                No strong patterns yet. Insights appear once there are at least{" "}
                {MIN_N} overlapping days with a clear signal ({metricsDays} days
                of metrics and {painDays} days of pain logged so far).
              </>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {insights.map((insight) => (
              <li
                key={`${insight.region}-${insight.metric}`}
                className="rounded-xl border bg-card p-4 shadow-sm space-y-2"
              >
                <p className="text-sm">{insight.text}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>n = {insight.n} days</span>
                  <span>r = {insight.pearson.toFixed(2)} (Pearson)</span>
                  <span>ρ = {insight.spearman.toFixed(2)} (Spearman)</span>
                  <span>
                    lag{" "}
                    {insight.lag === 0
                      ? "same day"
                      : `${insight.lag} day${insight.lag > 1 ? "s" : ""}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-[11px] text-muted-foreground">
          Correlation is not causation. These are observations from your own
          data over time, meant to prompt questions — not to change your
          rehabilitation program on their own.
        </p>
      </div>
    </div>
  );
}
