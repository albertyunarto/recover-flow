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
    </div>
  );
}
