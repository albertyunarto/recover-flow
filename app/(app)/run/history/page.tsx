import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft, Timer, TrendingUp, Zap } from "lucide-react";
import type { RunSession } from "@/types";

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function RunHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const { data: sessions } = await supabase
    .from("run_sessions")
    .select("*")
    .eq("user_id", authUser.id)
    .order("date", { ascending: false });

  const allSessions = (sessions ?? []) as RunSession[];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/run"
          className="active-scale flex items-center justify-center w-9 h-9 rounded-xl border bg-card shadow-sm"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Run History</h1>
      </div>

      {allSessions.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 shadow-sm text-center space-y-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted mx-auto">
            <Timer className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No runs logged yet</p>
          <p className="text-xs text-muted-foreground">
            Your run history will appear here once you complete a session.
          </p>
          <Link
            href="/run"
            className="active-scale inline-flex items-center gap-2 rounded-xl bg-success px-5 py-3 text-sm font-semibold text-white"
          >
            Go to Running
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {allSessions.map((session) => {
            const runMin = session.total_run_sec
              ? Math.round(session.total_run_sec / 60)
              : null;
            const totalMin = session.total_duration_sec
              ? Math.round(session.total_duration_sec / 60)
              : null;

            return (
              <div
                key={session.id}
                className="rounded-xl border bg-card p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(session.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Week {session.week_number} · Phase {session.phase}
                    </p>
                  </div>
                  {session.perceived_effort && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted">
                      <Zap className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">
                        RPE {session.perceived_effort}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  {session.planned_format}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-bold text-foreground">
                      {totalMin !== null ? `${totalMin}m` : "—"}
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-success/10">
                    <p className="text-xs text-muted-foreground">Running</p>
                    <p className="text-sm font-bold text-success">
                      {runMin !== null ? `${runMin}m` : "—"}
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-primary/10">
                    <p className="text-xs text-muted-foreground">Cycles</p>
                    <p className="text-sm font-bold text-primary">
                      {session.cycles_completed ?? "—"}
                    </p>
                  </div>
                </div>

                {session.notes && (
                  <p className="text-xs text-muted-foreground italic">&ldquo;{session.notes}&rdquo;</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
