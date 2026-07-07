"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { ImportDropzone } from "./import-dropzone";
import { ImportProgress } from "./import-progress";
import { ImportSummary } from "./import-summary";
import {
  importFitbitData,
  type ImportResultSummary,
} from "@/lib/actions/fitbit-import";
import type {
  ImportWorkerResult,
  WorkerInMessage,
  WorkerOutMessage,
} from "@/lib/fitbit/types";

type WizardState =
  | { step: "idle" }
  | { step: "parsing" }
  | { step: "review"; result: ImportWorkerResult; saveError?: string }
  | { step: "done"; result: ImportWorkerResult; summary: ImportResultSummary }
  | { step: "error"; message: string };

export function ImportWizard() {
  const [state, setState] = useState<WizardState>({ step: "idle" });
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [skipHeartRate, setSkipHeartRate] = useState(true);
  const [isSaving, startSaving] = useTransition();
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  function startWorker(message: WorkerInMessage) {
    workerRef.current?.terminate();
    setProgress({});
    setState({ step: "parsing" });

    const worker = new Worker(
      new URL("../../lib/fitbit/worker.ts", import.meta.url)
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      const msg = event.data;
      if (msg.type === "progress") {
        setProgress((prev) => ({ ...prev, [msg.folder]: msg.filesDone }));
      } else if (msg.type === "done") {
        setState({ step: "review", result: msg.result });
        worker.terminate();
        workerRef.current = null;
      } else if (msg.type === "error") {
        setState({ step: "error", message: msg.message });
        worker.terminate();
        workerRef.current = null;
      }
    };
    worker.onerror = () => {
      setState({ step: "error", message: "The import worker crashed." });
      worker.terminate();
      workerRef.current = null;
    };

    worker.postMessage(message);
  }

  return (
    <div className="space-y-4">
      {(state.step === "idle" || state.step === "error") && (
        <>
          {state.step === "error" && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.message}
            </div>
          )}
          <ImportDropzone
            onZip={(file) =>
              startWorker({
                type: "start-zip",
                file,
                skipFolders: skipHeartRate ? ["Heart Rate"] : [],
              })
            }
            onFolder={(files) =>
              startWorker({
                type: "start-files",
                files,
                skipFolders: skipHeartRate ? ["Heart Rate"] : [],
              })
            }
          />
          <label className="flex items-start gap-2 text-xs text-muted-foreground px-1">
            <input
              type="checkbox"
              checked={skipHeartRate}
              onChange={(e) => setSkipHeartRate(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Skip the Heart Rate folder (the largest — GBs of second-by-second
              data). Resting HR and daily min/avg still come from other folders.
              Untick only if you want intraday min/avg aggregated too.
            </span>
          </label>
        </>
      )}

      {state.step === "parsing" && <ImportProgress progress={progress} />}

      {state.step === "review" && (
        <>
          <ImportSummary result={state.result} />
          {state.saveError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.saveError}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving || state.result.totalDays === 0}
              onClick={() => {
                const { result } = state;
                startSaving(async () => {
                  const response = await importFitbitData({
                    partials: result.partials,
                    exercises: result.exercises,
                  });
                  if (response.summary) {
                    setState({ step: "done", result, summary: response.summary });
                  } else {
                    setState({
                      step: "review",
                      result,
                      saveError: response.error ?? "Import failed",
                    });
                  }
                });
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSaving
                ? "Saving…"
                : `Save ${state.result.totalDays} days to RecoverFlow`}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setState({ step: "idle" })}
              className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Start over
            </button>
          </div>
        </>
      )}

      {state.step === "done" && (
        <>
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Import complete</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {state.summary.daysUpserted} days saved
              {state.summary.weightsMirrored > 0 && (
                <> · {state.summary.weightsMirrored} weigh-ins added to your weight chart</>
              )}
              {state.summary.exercisesUpserted > 0 && (
                <> · {state.summary.exercisesUpserted} exercise sessions ready to review</>
              )}
              . Re-importing overlapping dates is always safe.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setState({ step: "idle" })}
            className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-muted"
          >
            Import another archive
          </button>
        </>
      )}
    </div>
  );
}
