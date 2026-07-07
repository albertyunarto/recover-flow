import { columnIndex, parseCsv } from "../csv";
import type {
  DailyMetricPartial,
  FileEntry,
  FitbitFolderParser,
  ParseResult,
} from "../types";

/**
 * Factory for the common CSV shape: one metric, roughly one row per day.
 * mapRow returns a partial for good rows and null for malformed/filtered
 * rows (counted as skipped, never thrown). First partial per date wins —
 * the main sleep of a day precedes its naps in Fitbit's exports.
 */
export function csvDailyParser(opts: {
  folder: string;
  filePattern: RegExp;
  metricLabel: string;
  mapRow(
    get: (...names: string[]) => string | undefined
  ): DailyMetricPartial | null;
}): FitbitFolderParser {
  return {
    folder: opts.folder,
    filePattern: opts.filePattern,
    metricLabel: opts.metricLabel,
    async parse(files: FileEntry[]): Promise<ParseResult> {
      const byDate = new Map<string, DailyMetricPartial>();
      let rowsParsed = 0;
      let rowsSkipped = 0;

      for (const file of files) {
        const { headers, rows } = parseCsv(file.content);
        if (headers.length === 0) continue;
        for (const row of rows) {
          const get = (...names: string[]) => {
            const idx = columnIndex(headers, ...names);
            return idx === -1 ? undefined : row[idx];
          };
          let partial: DailyMetricPartial | null = null;
          try {
            partial = opts.mapRow(get);
          } catch {
            partial = null;
          }
          if (!partial || !partial.date) {
            rowsSkipped++;
            continue;
          }
          rowsParsed++;
          if (!byDate.has(partial.date)) byDate.set(partial.date, partial);
        }
      }

      return { partials: [...byDate.values()], rowsParsed, rowsSkipped };
    },
  };
}

/** Parse a finite number from a CSV cell; null for missing/garbage. */
export function num(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
