import { createClient } from "@/lib/supabase/server";
import { formatDateSG, calculateStreak } from "@/lib/utils";
import { GreetingCard } from "@/components/dashboard/greeting-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PainSummaryCard } from "@/components/dashboard/pain-summary-card";
import { ExerciseSummaryCard } from "@/components/dashboard/exercise-summary-card";
import { NutritionSummaryCard } from "@/components/dashboard/nutrition-summary-card";
import { DashboardHydration } from "@/components/dashboard/dashboard-hydration";
import { StreakCard } from "@/components/dashboard/streak-card";
import { RunCard } from "@/components/dashboard/run-card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const today = formatDateSG();

  // Fetch all dashboard data in parallel
  const [
    { data: profile },
    { data: painEntries },
    { data: exerciseLogs },
    { data: nutritionEntries },
    { data: hydrationLog },
    { data: allExerciseDates },
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", authUser.id).single(),
    supabase
      .from("pain_entries")
      .select("*")
      .eq("user_id", authUser.id)
      .eq("date", today)
      .order("created_at"),
    supabase
      .from("exercise_logs")
      .select("*")
      .eq("user_id", authUser.id)
      .eq("date", today),
    supabase
      .from("nutrition_entries")
      .select("*")
      .eq("user_id", authUser.id)
      .eq("date", today),
    supabase
      .from("hydration_logs")
      .select("*")
      .eq("user_id", authUser.id)
      .eq("date", today)
      .single(),
    supabase
      .from("exercise_logs")
      .select("date")
      .eq("user_id", authUser.id)
      .order("date", { ascending: false })
      .limit(60),
  ]);

  const streak = calculateStreak(
    (allExerciseDates ?? []).map((e) => e.date)
  );

  const currentPhase = profile?.current_phase ?? 1;
  const currentWeek = profile?.current_week ?? 1;
  const name = profile?.name ?? "Albert";

  return (
    <div className="space-y-4">
      <GreetingCard name={name} phase={currentPhase} week={currentWeek} />

      <QuickActions currentPhase={currentPhase} />

      <div className="grid grid-cols-2 gap-4">
        <PainSummaryCard entries={painEntries ?? []} />
        <ExerciseSummaryCard logs={exerciseLogs ?? []} streak={streak} />
      </div>

      <NutritionSummaryCard
        entries={nutritionEntries ?? []}
        calorieTarget={profile?.daily_calorie_target ?? 1850}
        proteinTarget={profile?.daily_protein_target ?? 140}
      />

      <div className="grid grid-cols-2 gap-4">
        <DashboardHydration
          log={hydrationLog}
          targetMl={profile?.daily_water_target_ml ?? 3000}
        />
        <StreakCard streak={streak} />
      </div>

      <RunCard currentPhase={currentPhase} currentWeek={currentWeek} />
    </div>
  );
}
