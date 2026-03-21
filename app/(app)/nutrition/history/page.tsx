import { createClient } from "@/lib/supabase/server";
import { formatDateSG } from "@/lib/utils";

export default async function NutritionHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get last 14 days of nutrition entries
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const startDate = formatDateSG(twoWeeksAgo);

  const { data: entries } = await supabase
    .from("nutrition_entries")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .order("date", { ascending: false });

  const { data: profile } = await supabase
    .from("users")
    .select("daily_calorie_target, daily_protein_target")
    .eq("id", user.id)
    .single();

  const calTarget = profile?.daily_calorie_target ?? 1850;
  const protTarget = profile?.daily_protein_target ?? 140;

  // Group by date
  const grouped: Record<
    string,
    { calories: number; protein_g: number; count: number }
  > = {};
  for (const entry of entries ?? []) {
    if (!grouped[entry.date]) {
      grouped[entry.date] = { calories: 0, protein_g: 0, count: 0 };
    }
    grouped[entry.date].calories += entry.calories;
    grouped[entry.date].protein_g += entry.protein_g;
    grouped[entry.date].count++;
  }

  const days = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Nutrition History</h1>

      {days.length > 0 ? (
        <div className="space-y-2">
          {days.map(([date, data]) => {
            const calPct = Math.round((data.calories / calTarget) * 100);
            const protPct = Math.round((data.protein_g / protTarget) * 100);
            const dateObj = new Date(date + "T00:00:00");
            const dayLabel = dateObj.toLocaleDateString("en-SG", {
              weekday: "short",
              day: "numeric",
              month: "short",
              timeZone: "Asia/Singapore",
            });

            return (
              <div
                key={date}
                className="rounded-lg border bg-card px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{dayLabel}</span>
                  <span className="text-xs text-muted-foreground">
                    {data.count} meal{data.count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold">{data.calories}</span>
                      <span className="text-xs text-muted-foreground">
                        / {calTarget} kcal
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(calPct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold">
                        {data.protein_g}g
                      </span>
                      <span className="text-xs text-muted-foreground">
                        / {protTarget}g P
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full bg-success"
                        style={{ width: `${Math.min(protPct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            No nutrition data yet. Start logging meals!
          </p>
        </div>
      )}
    </div>
  );
}
