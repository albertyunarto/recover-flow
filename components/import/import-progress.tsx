"use client";

import { Loader2 } from "lucide-react";

export function ImportProgress({
  progress,
}: {
  progress: Record<string, number>;
}) {
  const folders = Object.entries(progress);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium">Reading archive…</span>
      </div>
      {folders.length === 0 ? (
        <p className="text-xs text-muted-foreground">Scanning for Fitbit data…</p>
      ) : (
        <ul className="space-y-1">
          {folders.map(([folder, count]) => (
            <li
              key={folder}
              className="flex items-center justify-between text-xs"
            >
              <span>{folder}</span>
              <span className="text-muted-foreground tabular-nums">
                {count} file{count === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
