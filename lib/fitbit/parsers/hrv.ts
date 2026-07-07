import { toIsoDateSG } from "../dates";
import { csvDailyParser, num } from "./csv-daily";

// Heart Rate Variability/Daily Heart Rate Variability Summary - *.csv:
// timestamp,rmssd,nremhr,entropy — one row per night.
export const hrvParser = csvDailyParser({
  folder: "Heart Rate Variability",
  filePattern: /^Daily Heart Rate Variability Summary.*\.csv$/i,
  metricLabel: "HRV nights",
  mapRow(get) {
    const timestamp = get("timestamp");
    const rmssd = num(get("rmssd"));
    if (!timestamp || rmssd === null || rmssd <= 0) return null;
    const date = toIsoDateSG(timestamp);
    if (!date) return null;
    return { date, hrv_rmssd: Math.round(rmssd * 100) / 100 };
  },
});
