import { toIsoDateSG, toIsoDatetimeSG } from "../dates";
import { milesToKm } from "../units";
import type {
  FileEntry,
  FitbitFolderParser,
  ImportedExerciseRow,
  ParseResult,
} from "../types";

// Global Export Data/exercise-N.json — chunked arrays of activity logs:
// { logId, activityName, startTime: "MM/DD/YY HH:MM:SS", duration (ms),
//   distance (miles), averageHeartRate, calories, ... }.
// Emits imported_exercises rows; contributes nothing to daily_metrics.

interface ExerciseLogEntry {
  logId?: number | string;
  activityName?: string;
  startTime?: string;
  duration?: number;
  activeDuration?: number;
  distance?: number;
  averageHeartRate?: number;
  calories?: number;
}

export const exerciseParser: FitbitFolderParser = {
  folder: "Global Export Data",
  filePattern: /^exercise-\d+\.json$/,
  metricLabel: "exercise sessions",
  async parse(files: FileEntry[]): Promise<ParseResult> {
    const bySourceId = new Map<string, ImportedExerciseRow>();
    let rowsParsed = 0;
    let rowsSkipped = 0;

    for (const file of files) {
      let logs: ExerciseLogEntry[];
      try {
        const parsed = JSON.parse(file.content);
        logs = Array.isArray(parsed) ? parsed : [];
      } catch {
        rowsSkipped++;
        continue;
      }
      for (const log of logs) {
        const startedAt = log.startTime ? toIsoDatetimeSG(log.startTime) : null;
        const date = log.startTime ? toIsoDateSG(log.startTime) : null;
        if (log.logId == null || !startedAt || !date || !log.activityName) {
          rowsSkipped++;
          continue;
        }
        const durationMs = log.activeDuration ?? log.duration;
        rowsParsed++;
        bySourceId.set(String(log.logId), {
          source_log_id: String(log.logId),
          started_at: startedAt,
          date,
          activity_type: log.activityName,
          duration_min:
            typeof durationMs === "number" && durationMs > 0
              ? Math.round(durationMs / 60000)
              : null,
          distance_km:
            typeof log.distance === "number" && log.distance > 0
              ? milesToKm(log.distance)
              : null,
          avg_hr:
            typeof log.averageHeartRate === "number" && log.averageHeartRate > 0
              ? Math.round(log.averageHeartRate)
              : null,
          calories:
            typeof log.calories === "number" && log.calories >= 0
              ? Math.round(log.calories)
              : null,
        });
      }
    }

    return {
      partials: [],
      exercises: [...bySourceId.values()],
      rowsParsed,
      rowsSkipped,
    };
  },
};
