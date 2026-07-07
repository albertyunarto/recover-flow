// Unit conversion for Fitbit Takeout files. The export always uses US units
// (miles, pounds) regardless of account display settings — convert at parse.

const KM_PER_MILE = 1.609344;
const KG_PER_POUND = 0.45359237;

export function milesToKm(miles: number): number {
  return Math.round(miles * KM_PER_MILE * 100) / 100;
}

export function poundsToKg(pounds: number): number {
  return Math.round(pounds * KG_PER_POUND * 10) / 10;
}

/** Sanity bounds mirror the daily_metrics.weight_kg DB check (30–200 kg). */
export function isPlausibleWeightKg(kg: number): boolean {
  return Number.isFinite(kg) && kg >= 30 && kg <= 200;
}
