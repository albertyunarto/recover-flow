import { toIsoDateSG } from "../dates";
import { csvDailyParser, num } from "./csv-daily";

// Sleep Score/sleep_score.csv — one row per scored sleep session:
// sleep_log_entry_id,timestamp,overall_score,composition_score,...
// The timestamp is the wake-up instant, so its SGT day is the readiness day.
export const sleepScoreParser = csvDailyParser({
  folder: "Sleep Score",
  filePattern: /^sleep_score.*\.csv$/i,
  metricLabel: "sleep scores",
  mapRow(get) {
    const timestamp = get("timestamp");
    const score = num(get("overall_score"));
    if (!timestamp || score === null || score <= 0) return null;
    const date = toIsoDateSG(timestamp);
    if (!date) return null;
    return { date, sleep_score: Math.round(score) };
  },
});
