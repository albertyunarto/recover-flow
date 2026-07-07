import type { DailyMetricPartial } from "./types";

/**
 * Merge parser outputs into one partial per date. Later non-null values win
 * within a field, so parser order only matters when two parsers emit the
 * same field for the same day (which the registry avoids by design).
 */
export function mergeDailyPartials(
  batches: DailyMetricPartial[][]
): DailyMetricPartial[] {
  const byDate = new Map<string, DailyMetricPartial>();

  for (const batch of batches) {
    for (const partial of batch) {
      if (!partial.date) continue;
      const existing = byDate.get(partial.date);
      if (!existing) {
        byDate.set(partial.date, { ...partial });
        continue;
      }
      for (const [key, value] of Object.entries(partial)) {
        if (key === "date" || value === null || value === undefined) continue;
        (existing as Record<string, unknown>)[key] = value;
      }
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
