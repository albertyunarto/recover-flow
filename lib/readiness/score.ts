import type { ReadinessComponent, ReadinessVerdict } from "@/types";

// Recovery Readiness Score — transparent weighted deltas vs personal
// baselines. Not medical advice: amber/red only ever REDUCE load.
//
// Weights (PRD): sleep 40, RHR delta 25, HRV delta 25, prior-day load 10.
// Missing components redistribute their weight proportionally across the
// present ones; the minimum to score at all is sleep + RHR.

export const WEIGHTS = { sleep: 40, rhr: 25, hrv: 25, load: 10 } as const;

/** score ≥ green → green; score ≥ amber → amber; else red. */
export const VERDICT_CUTOFFS = { green: 80, amber: 55 } as const;

export interface ReadinessInput {
  sleepScore: number | null;
  restingHr: number | null;
  hrvRmssd: number | null;
  /** Yesterday's active zone minutes */
  yesterdayAzm: number | null;
  baselineRestingHr: number | null;
  baselineHrvRmssd: number | null;
  baselineAzm7d: number | null;
}

export interface ReadinessResult {
  score: number;
  verdict: ReadinessVerdict;
  components: Record<string, ReadinessComponent>;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** 0..1 goodness fractions for each component; null = component missing. */
function fractions(input: ReadinessInput): Record<string, number | null> {
  const sleep =
    input.sleepScore !== null ? clamp01(input.sleepScore / 100) : null;

  // RHR: −2 bpm below baseline (or better) = full points; +5 bpm = zero.
  let rhr: number | null = null;
  if (input.restingHr !== null && input.baselineRestingHr !== null) {
    const delta = input.restingHr - input.baselineRestingHr;
    rhr = clamp01((5 - delta) / 7);
  }

  // HRV: ≥105% of baseline = full points; ≤75% = zero.
  let hrv: number | null = null;
  if (input.hrvRmssd !== null && input.baselineHrvRmssd !== null) {
    const ratio = input.hrvRmssd / input.baselineHrvRmssd;
    hrv = clamp01((ratio - 0.75) / 0.3);
  }

  // Load: yesterday at/below the 7-day average = full points; 2× = zero.
  let load: number | null = null;
  if (
    input.yesterdayAzm !== null &&
    input.baselineAzm7d !== null &&
    input.baselineAzm7d > 0
  ) {
    const ratio = input.yesterdayAzm / input.baselineAzm7d;
    load = clamp01(2 - ratio);
  }

  return { sleep, rhr, hrv, load };
}

export function verdictFor(score: number): ReadinessVerdict {
  if (score >= VERDICT_CUTOFFS.green) return "green";
  if (score >= VERDICT_CUTOFFS.amber) return "amber";
  return "red";
}

/**
 * Returns null when there isn't enough data to score (needs at least sleep
 * and RHR-vs-baseline). Component maxes are the reweighted weights, so they
 * always sum to ~100 regardless of which components are present.
 */
export function computeReadiness(input: ReadinessInput): ReadinessResult | null {
  const fracs = fractions(input);
  if (fracs.sleep === null || fracs.rhr === null) return null;

  const present = Object.entries(fracs).filter(
    (entry): entry is [string, number] => entry[1] !== null
  );
  const totalWeight = present.reduce(
    (sum, [key]) => sum + WEIGHTS[key as keyof typeof WEIGHTS],
    0
  );

  let weighted = 0;
  const components: Record<string, ReadinessComponent> = {};
  for (const [key, frac] of present) {
    const normMax = (WEIGHTS[key as keyof typeof WEIGHTS] / totalWeight) * 100;
    weighted += frac * normMax;
    components[key] = {
      pts: Math.round(frac * normMax),
      max: Math.round(normMax),
    };
  }

  const score = Math.round(weighted);
  return { score, verdict: verdictFor(score), components };
}

/**
 * Fallback sleep score when the Sleep Score folder is absent from the export:
 * half duration (8h = full credit), half efficiency.
 */
export function deriveSleepScore(
  sleepMinutes: number | null,
  efficiency: number | null
): number | null {
  if (sleepMinutes === null || efficiency === null) return null;
  const durationFrac = Math.min(1, sleepMinutes / 480);
  return Math.round(durationFrac * 50 + Math.min(100, efficiency) * 0.5);
}
