import { ThermometerSun } from "lucide-react";
import type { IllnessSignal } from "@/lib/readiness/illness";

export function IllnessBanner({ signal }: { signal: IllnessSignal }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-1.5">
      <div className="flex items-center gap-2">
        <ThermometerSun className="h-4 w-4 text-destructive" />
        <span className="text-sm font-semibold text-destructive">
          Possible illness — rest &amp; monitor
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        On {signal.date} your skin temperature was{" "}
        {signal.skinTempDeviation > 0 ? "+" : ""}
        {signal.skinTempDeviation.toFixed(1)}°C above baseline and resting heart
        rate was +{signal.rhrDelta} bpm ({signal.restingHr} vs{" "}
        {signal.baselineRestingHr}). These often precede getting sick.
      </p>
      <p className="text-xs text-muted-foreground">
        Consider an easy day and extra rest. If symptoms develop or persist, see
        a professional — this is a data pattern, not a diagnosis.
      </p>
    </div>
  );
}
