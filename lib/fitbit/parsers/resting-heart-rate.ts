import { toIsoDateSG } from "../dates";
import type {
  DailyMetricPartial,
  FileEntry,
  FitbitFolderParser,
  ParseResult,
} from "../types";

// Global Export Data/resting_heart_rate-YYYY-MM-DD.json — array of
// { dateTime: "MM/DD/YY 00:00:00", value: { date, value, error } }.
// Fitbit writes value 0 for days the device wasn't worn — treat as missing.

interface RhrEntry {
  dateTime?: string;
  value?: { value?: number };
}

export const restingHeartRateParser: FitbitFolderParser = {
  folder: "Global Export Data",
  filePattern: /^resting_heart_rate-\d{4}-\d{2}-\d{2}\.json$/,
  metricLabel: "resting HR days",
  async parse(files: FileEntry[]): Promise<ParseResult> {
    const byDate = new Map<string, DailyMetricPartial>();
    let rowsParsed = 0;
    let rowsSkipped = 0;

    for (const file of files) {
      let entries: RhrEntry[];
      try {
        const parsed = JSON.parse(file.content);
        entries = Array.isArray(parsed) ? parsed : [];
      } catch {
        rowsSkipped++;
        continue;
      }
      for (const entry of entries) {
        const rhr = entry.value?.value;
        const date = entry.dateTime ? toIsoDateSG(entry.dateTime) : null;
        if (!date || typeof rhr !== "number" || rhr <= 0) {
          rowsSkipped++;
          continue;
        }
        rowsParsed++;
        if (!byDate.has(date)) {
          byDate.set(date, { date, resting_hr: Math.round(rhr) });
        }
      }
    }

    return { partials: [...byDate.values()], rowsParsed, rowsSkipped };
  },
};
