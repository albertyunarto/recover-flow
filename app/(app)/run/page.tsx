import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser, getUserProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Lock, Play, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import runScheduleData from "@/lib/data/run-schedule.json";
import type { RunWeekSchedule, RunSession } from "@/types";

function formatRunSchedule(week: RunWeekSchedule): string {
  if (week.format) return week.format;
  return `Walk ${week.walk_min}min → Run ${week.run_min}min × ${week.cycles} cycles`;
}

export default async function RunPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  const profile = await getUserProfile();

  const currentPhase = profile?.current_phase ?? 1;
  const currentWeek = profile?.current_week ?? 1;

  // Phase 1 locked state
  if (currentPhase < 2) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">Running</h1>
        <div className="rounded-xl border bg-card p-6 shadow-sm text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Light running unlocks at Level 2</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Level 1 is all about safely reloading your strength. Easy run-walk intervals begin in
              Week 5 (Level 2) as light, secondary cardio — strength stays the priority.
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-left space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Level 2 Unlocks
            </p>
            <p className="text-sm text-foreground">Easy run-walk intervals, 2×/week</p>
            <p className="text-sm text-foreground">Gentle progression to a comfortable ~25-min light run</p>
            <p className="text-sm text-foreground">Audio cues &amp; form reminders</p>
          </div>
          <Link
            href="/exercises"
            className="active-scale inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Continue Level 1 Strength
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Get current week's schedule
  const schedule = runScheduleData.schedule as RunWeekSchedule[];
  const currentSchedule = schedule.find((s) => s.week === currentWeek);
  const phaseSchedule = schedule.filter((s) => s.phase === currentPhase);

  // Get sessions completed this week
  const supabase = await createClient();
  const { data: thisWeekSessions } = await supabase
    .from("run_sessions")
    .select("id, date, planned_format, perceived_effort")
    .eq("user_id", authUser.id)
    .eq("week_number", currentWeek)
    .order("date", { ascending: true });

  const sessionsCompleted = (thisWeekSessions ?? []).length;
  const sessionsTarget = currentSchedule?.sessions_per_week ?? 3;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Running</h1>
        <Link
          href="/run/history"
          className="active-scale text-sm text-primary font-medium flex items-center gap-1"
        >
          History
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Current week card */}
      {currentSchedule ? (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Week {currentWeek} · Level {currentPhase}
              </p>
              <p className="text-base font-semibold text-foreground mt-0.5">
                {formatRunSchedule(currentSchedule)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {currentSchedule.total_min
                  ? `${currentSchedule.total_min} min total`
                  : currentSchedule.total_run_min
                  ? `~${currentSchedule.total_run_min} min running`
                  : ""}
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-success/10 text-success">
              {sessionsCompleted}/{sessionsTarget} this week
            </span>
          </div>

          {/* Session dots */}
          <div className="flex gap-2">
            {Array.from({ length: sessionsTarget }).map((_, i) => (
              <div
                key={i}
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  i < sessionsCompleted
                    ? "border-success bg-success/10"
                    : "border-border bg-background"
                }`}
              >
                {i < sessionsCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          {/* Start button - only if interval-based (phase 2) */}
          {!currentSchedule.format && (
            <Link
              href="/run/session"
              className="active-scale flex items-center justify-center gap-2 w-full rounded-xl bg-success px-5 py-3.5 text-sm font-semibold text-white"
            >
              <Play className="w-5 h-5 fill-white" />
              Start Session
            </Link>
          )}

          {currentSchedule.format && (
            <Link
              href="/run/session"
              className="active-scale flex items-center justify-center gap-2 w-full rounded-xl bg-success px-5 py-3.5 text-sm font-semibold text-white"
            >
              <Play className="w-5 h-5 fill-white" />
              Log Session
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center text-muted-foreground text-sm">
          No schedule for Week {currentWeek}. Check back soon.
        </div>
      )}

      {/* Recent sessions */}
      {(thisWeekSessions ?? []).length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-foreground">This Week&apos;s Sessions</p>
          <div className="space-y-2">
            {(thisWeekSessions as RunSession[]).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(session.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">{session.planned_format}</p>
                </div>
                {session.perceived_effort && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    RPE {session.perceived_effort}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase schedule overview */}
      {phaseSchedule.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-foreground">Level {currentPhase} Schedule</p>
          <div className="space-y-2">
            {phaseSchedule.map((week) => {
              const isCurrentWeek = week.week === currentWeek;
              return (
                <div
                  key={week.week}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                    isCurrentWeek ? "bg-success/10 border border-success/30" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        isCurrentWeek ? "text-success" : "text-muted-foreground"
                      }`}
                    >
                      Wk {week.week}
                    </span>
                    <span className="text-xs text-foreground">{formatRunSchedule(week)}</span>
                  </div>
                  {isCurrentWeek && (
                    <span className="text-xs font-semibold text-success">Current</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
