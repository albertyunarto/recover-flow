import type {
  DailyMetricPartial,
  FileEntry,
  FitbitFolderParser,
  ParseResult,
} from "../types";

// Global Export Data/sleep-YYYY-MM-DD.json — array of sleep sessions.
// Two granularities: "stages" (30s: deep/light/rem/wake) and "classic"
// (60s: asleep/restless/awake — no stage breakdown, leave stages null).
// Naps appear as extra sessions on the same dateOfSleep: their minutes are
// added to the day totals, but efficiency comes from the main sleep only.

interface SleepSession {
  dateOfSleep?: string;
  minutesAsleep?: number;
  minutesAwake?: number;
  efficiency?: number;
  mainSleep?: boolean;
  type?: string;
  levels?: {
    summary?: Record<string, { minutes?: number }>;
  };
}

export const sleepParser: FitbitFolderParser = {
  folder: "Global Export Data",
  filePattern: /^sleep-\d{4}-\d{2}-\d{2}\.json$/,
  metricLabel: "sleep nights",
  async parse(files: FileEntry[]): Promise<ParseResult> {
    const byDate = new Map<string, DailyMetricPartial & { _main: boolean }>();
    let rowsParsed = 0;
    let rowsSkipped = 0;

    for (const file of files) {
      let sessions: SleepSession[];
      try {
        const parsed = JSON.parse(file.content);
        sessions = Array.isArray(parsed) ? parsed : [];
      } catch {
        rowsSkipped++;
        continue;
      }

      for (const session of sessions) {
        const date = session.dateOfSleep;
        const asleep = session.minutesAsleep;
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof asleep !== "number") {
          rowsSkipped++;
          continue;
        }
        rowsParsed++;

        const isMain = session.mainSleep === true;
        const summary = session.levels?.summary ?? {};
        const stageMin = (stage: string): number | null => {
          const minutes = summary[stage]?.minutes;
          return typeof minutes === "number" ? minutes : null;
        };
        const hasStages = session.type === "stages";

        const existing = byDate.get(date);
        if (!existing) {
          byDate.set(date, {
            date,
            sleep_minutes: asleep,
            awake_min: session.minutesAwake ?? null,
            sleep_efficiency: session.efficiency ?? null,
            deep_min: hasStages ? stageMin("deep") : null,
            light_min: hasStages ? stageMin("light") : null,
            rem_min: hasStages ? stageMin("rem") : null,
            _main: isMain,
          });
          continue;
        }

        // Additional session on the same day (nap or split sleep):
        // accumulate totals; main-sleep session owns efficiency + stages.
        existing.sleep_minutes = (existing.sleep_minutes ?? 0) + asleep;
        if (typeof session.minutesAwake === "number") {
          existing.awake_min = (existing.awake_min ?? 0) + session.minutesAwake;
        }
        if (isMain && !existing._main) {
          existing.sleep_efficiency = session.efficiency ?? null;
          existing.deep_min = hasStages ? stageMin("deep") : null;
          existing.light_min = hasStages ? stageMin("light") : null;
          existing.rem_min = hasStages ? stageMin("rem") : null;
          existing._main = true;
        }
      }
    }

    const partials = [...byDate.values()].map(({ _main, ...partial }) => partial);
    return { partials, rowsParsed, rowsSkipped };
  },
};
