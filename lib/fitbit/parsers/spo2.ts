import { toIsoDateSG } from "../dates";
import { csvDailyParser, num } from "./csv-daily";

// Oxygen Saturation (SpO2)/Daily SpO2 - *.csv — timestamp,average_value,
// lower_bound,upper_bound. One row per night.
export const spo2Parser = csvDailyParser({
  folder: "Oxygen Saturation (SpO2)",
  filePattern: /spo2.*\.csv$/i,
  metricLabel: "SpO2 nights",
  mapRow(get) {
    const timestamp = get("timestamp", "date");
    const avg = num(get("average_value", "average", "avg"));
    if (!timestamp || avg === null || avg <= 0) return null;
    const date = toIsoDateSG(timestamp);
    if (!date) return null;
    return { date, spo2_avg: Math.round(avg * 10) / 10 };
  },
});
