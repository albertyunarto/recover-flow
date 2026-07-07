import Link from "next/link";
import { Activity, ChevronRight } from "lucide-react";
import { getPainTrends } from "@/lib/actions/pain";
import { PainTrendChart } from "@/components/charts/pain-trend-chart";

export const metadata = {
  title: "Pain Trends | RecoverFlow",
};

export default async function PainTrendsPage() {
  // Default to 30d on server; client can refetch via server action
  const entries = await getPainTrends("30d");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pain Trends</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track how your pain levels change over time across all regions
        </p>
      </div>

      <PainTrendChart initialEntries={entries} />

      <Link
        href="/insights"
        className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm active-scale"
      >
        <Activity className="h-4 w-4 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Recovery Insights</p>
          <p className="text-xs text-muted-foreground">
            See how sleep, HR, and load line up with your pain
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </div>
  );
}
