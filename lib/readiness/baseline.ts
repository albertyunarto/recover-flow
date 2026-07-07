// Rolling personal baselines for the readiness score. Pure date/number math —
// usable from tests, server actions, and the import backfill alike.

export const BASELINE_WINDOW_DAYS = 30;
export const BASELINE_MIN_POINTS = 14;
export const LOAD_WINDOW_DAYS = 7;
export const LOAD_MIN_POINTS = 4;

export function addDaysIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Mean of values in the window [asOf - windowDays, asOf - 1] (the day itself
 * is excluded so today never pollutes its own baseline). Returns null when
 * fewer than minPoints days have data.
 */
export function rollingBaseline(
  valuesByDate: Map<string, number>,
  asOf: string,
  windowDays: number,
  minPoints: number
): number | null {
  const values: number[] = [];
  for (let i = 1; i <= windowDays; i++) {
    const value = valuesByDate.get(addDaysIso(asOf, -i));
    if (value !== undefined) values.push(value);
  }
  if (values.length < minPoints) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}
