import type { ExerciseProtocol, ProtocolType } from "@/types";
import phase1Data from "./phase-1.json";
import phase2Data from "./phase-2.json";
import phase3Data from "./phase-3.json";
import phase4Data from "./phase-4.json";

// Map phase number to JSON data
const phaseData: Record<number, { protocols: ExerciseProtocol[] }> = {
  1: phase1Data as { protocols: ExerciseProtocol[] },
  2: phase2Data as { protocols: ExerciseProtocol[] },
  3: phase3Data as { protocols: ExerciseProtocol[] },
  4: phase4Data as { protocols: ExerciseProtocol[] },
};

export function getProtocolsForPhase(phase: number): ExerciseProtocol[] {
  return phaseData[phase]?.protocols ?? [];
}

// dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
//
// Strength-first weekly layout (3 focused sessions/week):
//   strength: Mon, Wed, Fri  — the main resistance sessions
//   elbow:    Mon, Wed, Fri  — tendon loading paired with the gym sessions
//   cervical: daily          — short 5-6 min neck maintenance, keeps the C6 nerve happy
//   (light running lives on the Run page, ideally Tue/Sat — see run-schedule.json)
//
// core / lower_body / foot remain valid protocol types for historical logs,
// but their work is now folded into the full-body `strength` sessions.

const STRENGTH_DAYS = new Set([1, 3, 5]); // Mon, Wed, Fri

export function getProtocolForToday(
  phase: number,
  dayOfWeek: number
): ExerciseProtocol[] {
  const all = getProtocolsForPhase(phase);

  return all.filter((protocol) => {
    switch (protocol.protocol as ProtocolType) {
      case "cervical":
        return true;
      case "strength":
        return STRENGTH_DAYS.has(dayOfWeek);
      case "elbow":
        return STRENGTH_DAYS.has(dayOfWeek);
      default:
        return false;
    }
  });
}
