import { toIsoDateSG } from "../dates";
import type { FileEntry, FitbitFolderParser, ParseResult } from "../types";

// Global Export Data/steps-YYYY-MM-DD.json — intraday minute samples:
// { dateTime: "MM/DD/YY HH:MM:SS", value: "123" }. A year is ~500k rows, so
// this parser streams file-by-file (parseFile/finalize) and only keeps the
// per-day running sums in memory.

interface StepsEntry {
  dateTime?: string;
  value?: string | number;
}

function createState() {
  return {
    byDate: new Map<string, number>(),
    rowsParsed: 0,
    rowsSkipped: 0,
  };
}

let state = createState();

export const stepsParser: FitbitFolderParser = {
  folder: "Global Export Data",
  filePattern: /^steps-\d{4}-\d{2}-\d{2}\.json$/,
  metricLabel: "step days",

  parseFile(file: FileEntry) {
    let entries: StepsEntry[];
    try {
      const parsed = JSON.parse(file.content);
      entries = Array.isArray(parsed) ? parsed : [];
    } catch {
      state.rowsSkipped++;
      return;
    }
    for (const entry of entries) {
      const date = entry.dateTime ? toIsoDateSG(entry.dateTime) : null;
      const value = Number(entry.value);
      if (!date || !Number.isFinite(value) || value < 0) {
        state.rowsSkipped++;
        continue;
      }
      state.rowsParsed++;
      state.byDate.set(date, (state.byDate.get(date) ?? 0) + value);
    }
  },

  finalize(): ParseResult {
    const result: ParseResult = {
      partials: [...state.byDate.entries()].map(([date, steps]) => ({
        date,
        steps: Math.round(steps),
      })),
      rowsParsed: state.rowsParsed,
      rowsSkipped: state.rowsSkipped,
    };
    state = createState();
    return result;
  },

  // Batch fallback for callers that don't use the streaming interface.
  async parse(files: FileEntry[]): Promise<ParseResult> {
    for (const file of files) this.parseFile!(file);
    return this.finalize!();
  },
};
