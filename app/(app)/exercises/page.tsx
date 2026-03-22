import { getAuthUser, getUserProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateSG } from "@/lib/utils";
import { getProtocolForToday } from "@/lib/data/protocols";
import { ProtocolCard } from "@/components/exercises/protocol-card";
import type { ExerciseLog } from "@/types";
import { Dumbbell } from "lucide-react";

export default async function ExercisesPage() {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const profile = await getUserProfile();
  const currentPhase = profile?.current_phase ?? 1;
  const today = formatDateSG();
  const supabase = await createClient();

  // Get day of week in Singapore time (0 = Sunday)
  const sgDate = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Singapore" })
  );
  const dayOfWeek = sgDate.getDay();

  const todayProtocols = getProtocolForToday(currentPhase, dayOfWeek);

  const { data: exerciseLogs } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("user_id", authUser.id)
    .eq("date", today);

  const logs = (exerciseLogs ?? []) as ExerciseLog[];
  const logsByProtocol = Object.fromEntries(
    logs.map((l) => [l.protocol, l])
  );

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = dayNames[dayOfWeek];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Exercises</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {dayName} — {todayProtocols.length} protocol
          {todayProtocols.length !== 1 ? "s" : ""} scheduled today
        </p>
      </div>

      {todayProtocols.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <Dumbbell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">Rest day</p>
          <p className="text-sm text-muted-foreground mt-1">
            No protocols scheduled for today. Enjoy the recovery!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {todayProtocols.map((protocol) => {
            const log = logsByProtocol[protocol.protocol];
            return (
              <ProtocolCard
                key={protocol.protocol}
                protocol={protocol}
                log={log ?? null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
