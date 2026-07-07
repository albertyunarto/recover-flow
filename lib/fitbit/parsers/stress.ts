import { toIsoDateSG } from "../dates";
import { csvDailyParser, num } from "./csv-daily";

// Stress Score/Stress Score.csv — DATE,UPDATED_AT,STRESS_SCORE,...,CALCULATION_FAILED
// A failed calculation writes score 0; treat those as missing, not zero-stress.
export const stressParser = csvDailyParser({
  folder: "Stress Score",
  filePattern: /^Stress Score.*\.csv$/i,
  metricLabel: "stress scores",
  mapRow(get) {
    const failed = get("CALCULATION_FAILED");
    if (failed && failed.toLowerCase() === "true") return null;
    const rawDate = get("DATE");
    const score = num(get("STRESS_SCORE"));
    if (!rawDate || score === null || score <= 0) return null;
    const date = toIsoDateSG(rawDate);
    if (!date) return null;
    return { date, stress_score: Math.round(score) };
  },
});
