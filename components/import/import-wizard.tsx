"use client";

import { useEffect, useRef, useState } from "react";
import { ImportDropzone } from "./import-dropzone";
import { ImportProgress } from "./import-progress";
import { ImportSummary } from "./import-summary";
import type {
  ImportWorkerResult,
  WorkerInMessage,
  WorkerOutMessage,
} from "@/lib/fitbit/types";

type WizardState =
  | { step: "idle" }
  | { step: "parsing" }
  | { step: "review"; result: ImportWorkerResult }
  | { step: "error"; message: string };

export function ImportWizard() {
  const [state, setState] = useState<WizardState>({ step: "idle" });
  const [progress, setProgress] = useState<Record<string, number>>({});
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
            onZip={(file) => startWorker({ type: "start-zip", file })}
            onFolder={(files) => startWorker({ type: "start-files", files })}
          />
        </>
      )}

      {state.step === "parsing" && <ImportProgress progress={progress} />}

      {state.step === "review" && (
        <>
          <ImportSummary result={state.result} />
          <button
            type="button"
            onClick={() => setState({ step: "idle" })}
            className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-muted"
          >
            Parse another archive
          </button>
        </>
      )}
    </div>
  );
}
