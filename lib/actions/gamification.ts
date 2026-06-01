"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateStreak } from "@/lib/utils";
import { computeGameStats, type GameStats, type GameInputs } from "@/lib/gamification";

// Counts a completed exercise_logs query for a given protocol.
// "Completed" = at least one exercise done in the session.
async function countCompletedProtocol(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  protocol: string
): Promise<number> {
  const { count } = await supabase
    .from("exercise_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("protocol", protocol)
    .gt("completed_count", 0);
  return count ?? 0;
}

export async function getGameStats(): Promise<GameStats | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: profile },
    strengthSessions,
    cervicalSessions,
    elbowSessions,
    { count: runCount },
    { count: painCount },
    { count: weightCount },
    { count: reviewCount },
    { data: exerciseDates },
  ] = await Promise.all([
    supabase.from("users").select("current_phase").eq("id", user.id).single(),
    countCompletedProtocol(supabase, user.id, "strength"),
    countCompletedProtocol(supabase, user.id, "cervical"),
    countCompletedProtocol(supabase, user.id, "elbow"),
    supabase
      .from("run_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("pain_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("weight_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("weekly_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("week_completed", true),
    supabase
      .from("exercise_logs")
      .select("date")
      .eq("user_id", user.id)
      .gt("completed_count", 0)
      .order("date", { ascending: false })
      .limit(120),
  ]);

  const streak = calculateStreak((exerciseDates ?? []).map((e) => e.date));

  const inputs: GameInputs = {
    strengthSessions,
    cervicalSessions,
    elbowSessions,
    runSessions: runCount ?? 0,
    painEntries: painCount ?? 0,
    weightEntries: weightCount ?? 0,
    weeklyReviews: reviewCount ?? 0,
    streak,
    currentPhase: profile?.current_phase ?? 1,
  };

  return computeGameStats(inputs);
}
