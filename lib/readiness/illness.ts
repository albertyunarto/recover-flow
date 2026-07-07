import {
  rollingBaseline,
  BASELINE_MIN_POINTS,
  BASELINE_WINDOW_DAYS,
} from "./baseline";

// Illness / red-flag detection (PRD V1.1): skin temp deviation > +1.0°C AND
// resting HR > +8 bpm vs the 30-day baseline. Never a diagnosis — the banner
// always routes to a professional.
export const TEMP_FLAG_C = 1.0;
export const RHR_FLAG_BPM = 8;

export interface IllnessSignal {
  date: string;
  skinTempDeviation: number;
  restingHr: number;
  baselineRestingHr: number;
  rhrDelta: number;
}

export interface IllnessInput {
  date: string;
  resting_hr: number | null;
  skin_temp_deviation: number | null;
}

/**
 * Returns a signal for the most recent day that trips both thresholds, or
 * null. History must be ascending by date.
 */
export function detectIllness(history: IllnessInput[]): IllnessSignal | null {
  const rhrByDate = new Map<string, number>();
  for (const m of history) {
    if (m.resting_hr !== null) rhrByDate.set(m.date, m.resting_hr);
  }

  for (let i = history.length - 1; i >= 0; i--) {
    const day = history[i];
    if (day.resting_hr === null || day.skin_temp_deviation === null) continue;
    if (day.skin_temp_deviation <= TEMP_FLAG_C) continue;

    const baseline = rollingBaseline(
      rhrByDate,
      day.date,
      BASELINE_WINDOW_DAYS,
      BASELINE_MIN_POINTS
    );
    if (baseline === null) continue;
    const delta = day.resting_hr - baseline;
    if (delta <= RHR_FLAG_BPM) continue;

    return {
      date: day.date,
      skinTempDeviation: day.skin_temp_deviation,
      restingHr: day.resting_hr,
      baselineRestingHr: Math.round(baseline * 10) / 10,
      rhrDelta: Math.round(delta * 10) / 10,
    };
  }
  return null;
}
