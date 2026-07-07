import { toIsoDateSG } from "../dates";
import { csvDailyParser, num } from "./csv-daily";

// Temperature/Computed Temperature - YYYY-MM.csv — nightly skin temperature
// deviation from personal baseline (°C): type,dateTime,temperature.
export const temperatureParser = csvDailyParser({
  folder: "Temperature",
  filePattern: /^Computed Temperature.*\.csv$/i,
  metricLabel: "skin temp nights",
  mapRow(get) {
    const rawDate = get("dateTime", "date", "sleep_start");
    const deviation = num(
      get("temperature", "nightly_temperature", "deviation")
    );
    if (!rawDate || deviation === null) return null;
    // A deviation beyond ±5°C is sensor garbage, not physiology.
    if (Math.abs(deviation) > 5) return null;
    const date = toIsoDateSG(rawDate);
    if (!date) return null;
    return { date, skin_temp_deviation: Math.round(deviation * 10) / 10 };
  },
});
