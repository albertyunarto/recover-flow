import { getAuthUser, getUserProfile } from "@/lib/supabase/auth";
import { getWeeklyStats, getWeeklyReview } from "@/lib/actions/weekly-review";
import { WeeklyReviewForm } from "@/components/progress/weekly-review-form";
import phasesData from "@/lib/data/phases.json";

export default async function WeeklyReviewPage() {
  const user = await getAuthUser();
  if (!user) return null;

  const profile = await getUserProfile();

  const weekNumber = profile?.current_week ?? 1;
  const phase = profile?.current_phase ?? 1;

  const [stats, existingReview] = await Promise.all([
    getWeeklyStats(weekNumber),
    getWeeklyReview(weekNumber),
  ]);

  // Find gate criteria for current phase transition
  const transition = phasesData.transitions.find((t) => t.from === phase);
  const gateCriteria = (transition?.criteria ?? []) as Array<{ id: string; label: string; type: "auto" | "manual" }>;

  if (!stats) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Week {weekNumber} Review</h1>
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            Not enough data for this week yet. Keep logging!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Week {weekNumber} Review</h1>
      <WeeklyReviewForm
        stats={stats}
        weekNumber={weekNumber}
        phase={phase}
        gateCriteria={gateCriteria}
        alreadyCompleted={existingReview?.week_completed ?? false}
      />
    </div>
  );
}
