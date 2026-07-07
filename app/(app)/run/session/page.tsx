import { redirect } from "next/navigation";
import { getAuthUser, getUserProfile } from "@/lib/supabase/auth";
import { IntervalTimer } from "@/components/timer/interval-timer";
import runScheduleData from "@/lib/data/run-schedule.json";
import type { RunWeekSchedule } from "@/types";

type LocalTimerInterval = { type: "walk" | "run"; duration_sec: number };

function buildIntervals(schedule: RunWeekSchedule): LocalTimerInterval[] {
  if (schedule.format) {
    // For phase 3+ with free-format sessions, return empty (will show log-only UI)
    return [];
  }
  if (!schedule.cycles || !schedule.walk_min || !schedule.run_min) return [];
  const intervals: LocalTimerInterval[] = [];
  for (let i = 0; i < schedule.cycles; i++) {
    // Walk first, then run
    intervals.push({ type: "walk", duration_sec: schedule.walk_min * 60 });
    intervals.push({ type: "run", duration_sec: schedule.run_min * 60 });
  }
  return intervals;
}

export default async function RunSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  const profile = await getUserProfile();

  const currentPhase = profile?.current_phase ?? 1;
  const currentWeek = profile?.current_week ?? 1;

  if (currentPhase < 2) {
    redirect("/run");
  }

  const schedule = runScheduleData.schedule as RunWeekSchedule[];

  // Readiness "hold" suggestion: allow running an EARLIER week's session
  // (never a later one — the override can only reduce load).
  const { week: weekParam } = await searchParams;
  const requestedWeek = weekParam ? parseInt(weekParam, 10) : NaN;
  const sessionWeek =
    Number.isInteger(requestedWeek) && requestedWeek < currentWeek
      ? requestedWeek
      : currentWeek;

  const currentSchedule = schedule.find((s) => s.week === sessionWeek);

  if (!currentSchedule) {
    redirect("/run");
  }

  const intervals = buildIntervals(currentSchedule);
  const plannedFormat = currentSchedule.format ??
    `Walk ${currentSchedule.walk_min}min → Run ${currentSchedule.run_min}min × ${currentSchedule.cycles} cycles`;

  return (
    <IntervalTimer
      intervals={intervals}
      weekNumber={sessionWeek}
      phase={currentSchedule.phase}
      plannedFormat={plannedFormat}
      totalCycles={currentSchedule.cycles ?? 0}
    />
  );
}
