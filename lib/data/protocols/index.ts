import type { ExerciseProtocol, ProtocolType } from "@/types";
import phase1Data from "./phase-1.json";

// Map phase number to JSON data
const phaseData: Record<number, { protocols: ExerciseProtocol[] }> = {
  1: phase1Data as { protocols: ExerciseProtocol[] },
};

export function getProtocolsForPhase(phase: number): ExerciseProtocol[] {
  return phaseData[phase]?.protocols ?? [];
}

// dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
// Schedule:
//   cervical: daily
//   elbow: daily
//   core: Mon, Wed, Fri (1, 3, 5)
//   lower_body: Tue, Thu, Sat (2, 4, 6)
//   foot: daily

const CORE_DAYS = new Set([1, 3, 5]); // Mon, Wed, Fri
const LOWER_BODY_DAYS = new Set([2, 4, 6]); // Tue, Thu, Sat

export function getProtocolForToday(
  phase: number,
  dayOfWeek: number
): ExerciseProtocol[] {
  const all = getProtocolsForPhase(phase);

  return all.filter((protocol) => {
    switch (protocol.protocol as ProtocolType) {
      case "cervical":
        return true;
      case "elbow":
        return true;
      case "foot":
        return true;
      case "core":
        return CORE_DAYS.has(dayOfWeek);
      case "lower_body":
        return LOWER_BODY_DAYS.has(dayOfWeek);
      default:
        return false;
    }
  });
}
