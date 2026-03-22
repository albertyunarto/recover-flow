import { notFound } from "next/navigation";
import { getAuthUser, getUserProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateSG } from "@/lib/utils";
import { getProtocolsForPhase } from "@/lib/data/protocols";
import { ExerciseSession } from "@/components/exercises/exercise-session";
import type { ExerciseLog, ProtocolType } from "@/types";

const VALID_PROTOCOLS: ProtocolType[] = [
  "cervical",
  "elbow",
  "core",
  "lower_body",
  "foot",
];

interface PageProps {
  params: Promise<{ protocol: string }>;
}

export default async function ProtocolSessionPage({ params }: PageProps) {
  const { protocol: protocolParam } = await params;

  if (!VALID_PROTOCOLS.includes(protocolParam as ProtocolType)) {
    notFound();
  }

  const protocol = protocolParam as ProtocolType;

  const authUser = await getAuthUser();
  if (!authUser) return null;

  const profile = await getUserProfile();
  const currentPhase = profile?.current_phase ?? 1;
  const today = formatDateSG();
  const supabase = await createClient();

  const allProtocols = getProtocolsForPhase(currentPhase);
  const protocolData = allProtocols.find((p) => p.protocol === protocol);

  if (!protocolData) {
    notFound();
  }

  const { data: existingLog } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("user_id", authUser.id)
    .eq("date", today)
    .eq("protocol", protocol)
    .maybeSingle();

  const log = existingLog as ExerciseLog | null;

  return (
    <ExerciseSession
      protocol={protocolData}
      phase={currentPhase}
      existingLog={log}
    />
  );
}
