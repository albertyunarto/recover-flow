import { toIsoDateSG } from "../dates";
import type { FileEntry, FitbitFolderParser, ParseResult } from "../types";

// Heart Rate/heart_rate-YYYY-MM-DD.json — intraday BPM at ~5s intervals,
// ~17k samples/day and potentially GBs across a full export. This is the
// largest folder, so it is processed LAST and is skippable. It streams
// file-by-file, aggregating to daily {min, avg}; raw samples are dropped
// immediately and never uploaded.

interface HrSample {
  dateTime?: string;
  value?: { bpm?: number } | number;
}

function bpmOf(sample: HrSample): number | null {
  const v = sample.value;
  if (typeof v === "number") return v;
  if (v && typeof v.bpm === "number") return v.bpm;
  return null;
}

interface DayAgg {
  min: number;
  sum: number;
  count: number;
}

function createState() {
  return {
    byDate: new Map<string, DayAgg>(),
    rowsParsed: 0,
    rowsSkipped: 0,
  };
}

let state = createState();

export const heartRateParser: FitbitFolderParser = {
  folder: "Heart Rate",
  filePattern: /^heart_rate-\d{4}-\d{2}-\d{2}\.json$/,
  metricLabel: "heart-rate days",

  parseFile(file: FileEntry) {
    let samples: HrSample[];
    try {
      const parsed = JSON.parse(file.content);
      samples = Array.isArray(parsed) ? parsed : [];
    } catch {
      state.rowsSkipped++;
      return;
    }
    for (const sample of samples) {
      const bpm = bpmOf(sample);
      const date = sample.dateTime ? toIsoDateSG(sample.dateTime) : null;
      if (!date || bpm === null || bpm <= 0) {
        state.rowsSkipped++;
        continue;
      }
      state.rowsParsed++;
      const agg = state.byDate.get(date);
      if (!agg) {
        state.byDate.set(date, { min: bpm, sum: bpm, count: 1 });
      } else {
        agg.min = Math.min(agg.min, bpm);
        agg.sum += bpm;
        agg.count += 1;
      }
    }
    // Free the parsed array before the next file — keeps memory flat.
  },

  finalize(): ParseResult {
    const result: ParseResult = {
      partials: [...state.byDate.entries()].map(([date, agg]) => ({
        date,
        hr_min: agg.min,
        hr_avg: Math.round(agg.sum / agg.count),
      })),
      rowsParsed: state.rowsParsed,
      rowsSkipped: state.rowsSkipped,
    };
    state = createState();
    return result;
  },

  async parse(files: FileEntry[]): Promise<ParseResult> {
    for (const file of files) this.parseFile!(file);
    return this.finalize!();
  },
};
