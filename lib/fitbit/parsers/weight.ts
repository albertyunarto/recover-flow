import { toIsoDateSG } from "../dates";
import { isPlausibleWeightKg, poundsToKg } from "../units";
import type {
  DailyMetricPartial,
  FileEntry,
  FitbitFolderParser,
  ParseResult,
} from "../types";

// Global Export Data/weight-YYYY-MM-DD.json — array of
// { logId, date: "MM/DD/YY", time, weight, bmi, source }.
// Weight is ALWAYS in pounds regardless of account display settings.

interface WeightLog {
  date?: string;
  weight?: number;
}

export const weightParser: FitbitFolderParser = {
  folder: "Global Export Data",
  filePattern: /^weight-\d{4}-\d{2}-\d{2}\.json$/,
  metricLabel: "weigh-ins",
  async parse(files: FileEntry[]): Promise<ParseResult> {
    const byDate = new Map<string, DailyMetricPartial>();
    let rowsParsed = 0;
    let rowsSkipped = 0;

    for (const file of files) {
      let logs: WeightLog[];
      try {
        const parsed = JSON.parse(file.content);
        logs = Array.isArray(parsed) ? parsed : [];
      } catch {
        rowsSkipped++;
        continue;
      }
      for (const log of logs) {
        const date = log.date ? toIsoDateSG(log.date) : null;
        const kg =
          typeof log.weight === "number" ? poundsToKg(log.weight) : NaN;
        if (!date || !isPlausibleWeightKg(kg)) {
          rowsSkipped++;
          continue;
        }
        rowsParsed++;
        // Multiple weigh-ins per day: keep the first (morning weigh-in).
        if (!byDate.has(date)) byDate.set(date, { date, weight_kg: kg });
      }
    }

    return { partials: [...byDate.values()], rowsParsed, rowsSkipped };
  },
};
