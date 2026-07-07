import type { FitbitFolderParser } from "./types";

/**
 * Folders we know about in a Takeout Fitbit archive, whether or not a parser
 * exists for them yet. Used by the dry-run report to distinguish "found but
 * unused" from "genuinely unknown" (a signal Google changed the export).
 */
export const KNOWN_FOLDERS = [
  "Global Export Data",
  "Heart Rate Variability",
  "Sleep Score",
  "Heart Rate",
  "Stress Score",
  "Oxygen Saturation (SpO2)",
  "Temperature",
  "Active Zone Minutes (AZM)",
  "Daily Readiness",
] as const;

/**
 * Registered folder parsers. A missing folder is not an error — every parser
 * is optional and the import succeeds with partial data.
 */
export const parsers: FitbitFolderParser[] = [];

export function findParser(
  folder: string,
  fileName: string
): FitbitFolderParser | undefined {
  return parsers.find(
    (p) => p.folder === folder && p.filePattern.test(fileName)
  );
}

/**
 * Extract the folder name directly under ".../Fitbit/" from an archive path.
 * Returns null for paths outside the Fitbit export (e.g. Takeout metadata).
 */
export function fitbitFolderOf(path: string): string | null {
  const segments = path.split("/").filter(Boolean);
  const fitbitIdx = segments.findIndex((s) => s === "Fitbit");
  // Need at least Fitbit/<folder>/<file>
  if (fitbitIdx === -1 || segments.length < fitbitIdx + 3) return null;
  return segments[fitbitIdx + 1];
}
