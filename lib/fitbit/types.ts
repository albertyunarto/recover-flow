import type { DailyMetrics } from "@/types";

// ========================================
// Parser contract — FROZEN after Phase 1.
// Every folder parser must:
//  - convert units at parse time (miles→km, pounds→kg)
//  - normalize all dates to ISO 8601 in Asia/Singapore
//  - glob by filename prefix (export files are chunked ~monthly)
//  - skip + count malformed rows, never throw on one
//  - treat a missing folder as normal, not an error
// ========================================

/** A single decoded file from the Takeout archive. */
export interface FileEntry {
  /** Basename, e.g. "sleep-2026-01-01.json" */
  name: string;
  /** Decoded UTF-8 content */
  content: string;
}

/** Partial daily_metrics row produced by a parser; merged across parsers by date. */
export type DailyMetricPartial = { date: string } & Partial<
  Omit<DailyMetrics, "id" | "user_id" | "date" | "source" | "imported_at">
>;

/** Exercise session extracted from the export, pre-persistence shape. */
export interface ImportedExerciseRow {
  source_log_id: string;
  started_at: string; // ISO 8601 with +08:00 offset
  date: string; // ISO date in SGT, for plan matching
  activity_type: string;
  duration_min: number | null;
  distance_km: number | null;
  avg_hr: number | null;
  calories: number | null;
}

export interface ParseResult {
  partials: DailyMetricPartial[];
  exercises?: ImportedExerciseRow[];
  rowsParsed: number;
  rowsSkipped: number;
}

export interface FitbitFolderParser {
  /** Folder name directly under Takeout/Fitbit/, e.g. "Sleep Score" */
  folder: string;
  /** Matched against file basenames within the folder */
  filePattern: RegExp;
  /** Human label for the import summary, e.g. "sleep nights" */
  metricLabel: string;
  parse(files: FileEntry[]): Promise<ParseResult>;
  /**
   * Streaming alternative for huge folders (intraday Heart Rate, steps):
   * when implemented, the worker feeds files one at a time and never buffers
   * the folder in memory. finalize() returns the accumulated result and
   * resets internal state.
   */
  parseFile?(file: FileEntry): void;
  finalize?(): ParseResult;
}

// ========================================
// Worker protocol
// ========================================

export interface FolderReport {
  folder: string;
  metricLabel: string;
  files: number;
  rowsParsed: number;
  rowsSkipped: number;
  /** Distinct dates contributed to daily_metrics */
  days: number;
  exercises?: number;
}

export interface ImportWorkerResult {
  partials: DailyMetricPartial[];
  exercises: ImportedExerciseRow[];
  folderReports: FolderReport[];
  /** Folders present in the archive with no registered parser */
  unknownFolders: string[];
  /** Known folders that were NOT found in the archive */
  missingFolders: string[];
  totalDays: number;
  durationMs: number;
}

export type WorkerInMessage =
  | { type: "start-zip"; file: File; skipFolders?: string[] }
  | {
      type: "start-files";
      files: { path: string; file: File }[];
      skipFolders?: string[];
    };

export type WorkerOutMessage =
  | { type: "progress"; folder: string; filesDone: number }
  | { type: "done"; result: ImportWorkerResult }
  | { type: "error"; message: string };
