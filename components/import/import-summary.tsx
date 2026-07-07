"use client";

import { AlertTriangle, Check, HelpCircle, Minus } from "lucide-react";
import type { ImportWorkerResult } from "@/lib/fitbit/types";

export function ImportSummary({ result }: { result: ImportWorkerResult }) {
  const totalExercises = result.exercises.length;
  const seconds = (result.durationMs / 1000).toFixed(1);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
      <div>
        <h2 className="text-sm font-semibold">
          {result.totalDays} day{result.totalDays === 1 ? "" : "s"} of data
          found
        </h2>
        <p className="text-xs text-muted-foreground">
          Parsed in {seconds}s{totalExercises > 0 && (
            <> · {totalExercises} exercise session{totalExercises === 1 ? "" : "s"}</>
          )}
        </p>
      </div>

      {result.folderReports.length > 0 && (
        <ul className="space-y-1.5">
          {result.folderReports.map((r) => (
            <li
              key={`${r.folder}/${r.metricLabel}`}
              className="flex items-center gap-2 text-xs"
            >
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-medium capitalize">{r.metricLabel}</span>
              <span className="ml-auto text-muted-foreground tabular-nums text-right">
                {r.days > 0 && <>{r.days} days · </>}
                {r.rowsParsed} rows
                {r.rowsSkipped > 0 && (
                  <span className="text-amber-600"> · {r.rowsSkipped} skipped</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {result.missingFolders.length > 0 && (
        <div className="space-y-1">
          {result.missingFolders.map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <Minus className="h-3.5 w-3.5 shrink-0" />
              <span>{f} — not in this archive (that&apos;s fine)</span>
            </div>
          ))}
        </div>
      )}

      {result.unknownFolders.length > 0 && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 px-3 py-2 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <HelpCircle className="h-3.5 w-3.5" />
            Unrecognized folders (skipped)
          </div>
          <p className="text-xs text-muted-foreground">
            {result.unknownFolders.join(", ")}
          </p>
        </div>
      )}

      {result.totalDays === 0 && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            No daily data was found. Make sure this is a Google Takeout archive
            containing a <code>Fitbit/</code> folder.
          </span>
        </div>
      )}
    </div>
  );
}
