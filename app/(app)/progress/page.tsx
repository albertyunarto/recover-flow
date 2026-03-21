import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ClipboardCheck, Scale } from "lucide-react";
import { PhaseProgress } from "@/components/progress/phase-progress";
import { WeightChart } from "@/components/charts/weight-chart";
import { getWeightHistory } from "@/lib/actions/weight";
import { logWeight } from "@/lib/actions/weight";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, weightEntries] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    getWeightHistory(),
  ]);

  const currentPhase = profile?.current_phase ?? 1;
  const currentWeek = profile?.current_week ?? 1;
  const targetWeight = parseFloat(String(profile?.target_weight_kg ?? 77));
  const startWeight = parseFloat(String(profile?.start_weight_kg ?? 88));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Progress</h1>

      {/* Phase Progress */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">Phase Progress</h2>
        <PhaseProgress currentPhase={currentPhase} currentWeek={currentWeek} />
      </div>

      {/* Weight Chart */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Weight Trend</h2>
          <WeightLogButton />
        </div>
        <WeightChart
          entries={weightEntries}
          targetWeight={targetWeight}
          startWeight={startWeight}
        />
      </div>

      {/* Weekly Review */}
      <Link
        href="/progress/review"
        className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm active-scale"
      >
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Weekly Review</p>
          <p className="text-xs text-muted-foreground">
            Review Week {currentWeek} stats and check gate criteria
          </p>
        </div>
      </Link>
    </div>
  );
}

function WeightLogButton() {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";
        await logWeight(formData);
      }}
      className="flex items-center gap-2"
    >
      <input
        name="weight_kg"
        type="number"
        step="0.1"
        placeholder="kg"
        className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
        required
      />
      <button
        type="submit"
        className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground active:scale-95"
      >
        <Scale className="h-3 w-3" />
        Log
      </button>
    </form>
  );
}
