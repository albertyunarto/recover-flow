"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Play, Pause, RotateCcw, Save, ChevronLeft } from "lucide-react";
import { useTimer } from "@/lib/hooks/use-timer";
import { useAudio } from "@/lib/hooks/use-audio";
import { logRun } from "@/lib/actions/run";
import { cn } from "@/lib/utils";

const FORM_CUES = [
  "Chin tucked",
  "Short steps",
  "Midfoot landing",
  "Relax shoulders",
  "Arms at 90°",
  "Eyes forward",
  "Breathe rhythmically",
  "Light feet, quiet steps",
];

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.floor(Math.abs(seconds) % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export interface TimerIntervalItem {
  type: "walk" | "run";
  duration_sec: number;
}

interface IntervalTimerProps {
  intervals: TimerIntervalItem[];
  weekNumber: number;
  phase: number;
  plannedFormat: string;
  totalCycles?: number;
}

export function IntervalTimer({
  intervals,
  weekNumber,
  phase,
  plannedFormat,
}: IntervalTimerProps) {
  const router = useRouter();
  const timer = useTimer(intervals);
  const audio = useAudio();

  const [cueIndex, setCueIndex] = useState(0);
  const [effort, setEffort] = useState(5);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const prevIntervalRef = useRef(0);
  const prevCompleteRef = useRef(false);

  // Audio on interval change
  useEffect(() => {
    if (timer.currentIntervalIndex !== prevIntervalRef.current) {
      const prevType = intervals[prevIntervalRef.current]?.type;
      const currType = intervals[timer.currentIntervalIndex]?.type;
      if (prevType === "walk" && currType === "run") {
        audio.playWalkToRun();
      } else if (prevType === "run" && currType === "walk") {
        audio.playRunToWalk();
      }
      prevIntervalRef.current = timer.currentIntervalIndex;
      setCueIndex((i) => (i + 1) % FORM_CUES.length);
    }
  }, [timer.currentIntervalIndex, intervals, audio]);

  // Audio on complete
  useEffect(() => {
    if (timer.isComplete && !prevCompleteRef.current) {
      audio.playComplete();
    }
    prevCompleteRef.current = timer.isComplete;
  }, [timer.isComplete, audio]);

  // Rotate form cues every 20s while running
  useEffect(() => {
    if (!timer.isRunning) return;
    const id = setInterval(() => {
      setCueIndex((i) => (i + 1) % FORM_CUES.length);
    }, 20000);
    return () => clearInterval(id);
  }, [timer.isRunning]);

  const handleStart = useCallback(() => {
    audio.initAudio();
    timer.start();
  }, [audio, timer]);

  const handleResume = useCallback(() => {
    audio.initAudio();
    timer.resume();
  }, [audio, timer]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    const totalRunSec = intervals
      .filter((intv) => intv.type === "run")
      .reduce((sum, intv) => sum + intv.duration_sec, 0);
    const totalWalkSec = intervals
      .filter((intv) => intv.type === "walk")
      .reduce((sum, intv) => sum + intv.duration_sec, 0);

    const fd = new FormData();
    fd.set("week_number", String(weekNumber));
    fd.set("phase", String(phase));
    fd.set("planned_format", plannedFormat);
    fd.set("total_duration_sec", String(Math.round(timer.totalElapsed)));
    fd.set("total_run_sec", String(totalRunSec));
    fd.set("total_walk_sec", String(totalWalkSec));
    fd.set("cycles_completed", String(timer.totalCycles));
    fd.set("perceived_effort", String(effort));
    fd.set("notes", notes);

    const result = await logRun(fd);
    setSaving(false);
    if (result?.error) {
      setSaveError(result.error);
    } else {
      setSavedSuccess(true);
      setTimeout(() => router.push("/run"), 1500);
    }
  }

  const isWalk = timer.currentInterval?.type === "walk";
  const isRun = timer.currentInterval?.type === "run";
  const nextInterval = intervals[timer.currentIntervalIndex + 1] ?? null;

  // Free-form session (phase 3+ with no intervals)
  if (intervals.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/run"
            className="active-scale flex items-center justify-center w-9 h-9 rounded-xl border bg-card shadow-sm"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-foreground">Log Session</h1>
            <p className="text-xs text-muted-foreground">
              Week {weekNumber} · Phase {phase}
            </p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">{plannedFormat}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Complete your session and log your effort below.
          </p>
        </div>
        <SaveSection
          effort={effort}
          notes={notes}
          isSaving={saving}
          saveError={saveError}
          savedSuccess={savedSuccess}
          setEffort={setEffort}
          setNotes={setNotes}
          onSave={handleSave}
        />
      </div>
    );
  }

  // Completion screen
  if (timer.isComplete) {
    const totalRunSec = intervals
      .filter((intv) => intv.type === "run")
      .reduce((sum, intv) => sum + intv.duration_sec, 0);
    const totalWalkSec = intervals
      .filter((intv) => intv.type === "walk")
      .reduce((sum, intv) => sum + intv.duration_sec, 0);

    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm text-center space-y-3">
          <div className="text-4xl">🎉</div>
          <h2 className="text-xl font-bold text-foreground">Session Complete!</h2>
          <p className="text-sm text-muted-foreground">{plannedFormat}</p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total</p>
              <p className="text-lg font-bold text-foreground">
                {formatTime(timer.totalElapsed)}
              </p>
            </div>
            <div className="rounded-lg bg-success/10 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Running</p>
              <p className="text-lg font-bold text-success">{formatTime(totalRunSec)}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Walking</p>
              <p className="text-lg font-bold text-primary">{formatTime(totalWalkSec)}</p>
            </div>
          </div>
        </div>

        <SaveSection
          effort={effort}
          notes={notes}
          isSaving={saving}
          saveError={saveError}
          savedSuccess={savedSuccess}
          setEffort={setEffort}
          setNotes={setNotes}
          onSave={handleSave}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[80vh]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/run"
          className="active-scale flex items-center justify-center w-9 h-9 rounded-xl border bg-card shadow-sm"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </Link>
        <div>
          <p className="text-sm font-semibold text-foreground">{plannedFormat}</p>
          <p className="text-xs text-muted-foreground">Week {weekNumber} · Phase {phase}</p>
        </div>
      </div>

      {/* Main timer card */}
      <div
        className={cn(
          "flex-1 flex flex-col items-center justify-center rounded-2xl px-6 py-10 transition-colors duration-500 mb-4",
          isWalk
            ? "bg-primary/10 border-2 border-primary/20"
            : "bg-success/10 border-2 border-success/20"
        )}
      >
        {/* State badge */}
        <div
          className={cn(
            "px-8 py-2.5 rounded-full text-xl font-extrabold uppercase tracking-widest mb-5",
            isWalk ? "bg-primary text-primary-foreground" : "bg-success text-success-foreground"
          )}
        >
          {isWalk ? "WALK" : "RUN"}
        </div>

        {/* Big countdown */}
        <p
          className={cn(
            "text-8xl font-black tabular-nums leading-none mb-3",
            isWalk ? "text-primary" : "text-success"
          )}
        >
          {formatTime(timer.timeRemaining)}
        </p>

        {/* Cycle info */}
        <p className="text-sm font-semibold text-muted-foreground mb-1">
          Cycle {timer.currentCycle} of {timer.totalCycles}
        </p>

        {/* Total elapsed */}
        <p className="text-xs text-muted-foreground mb-6">
          Elapsed: {formatTime(timer.totalElapsed)}
        </p>

        {/* Next up */}
        {nextInterval && (
          <div className="px-4 py-2.5 rounded-xl bg-background/70 border border-border mb-8">
            <p className="text-xs text-center text-muted-foreground">
              Then:{" "}
              <span
                className={cn(
                  "font-bold",
                  nextInterval.type === "run" ? "text-success" : "text-primary"
                )}
              >
                {nextInterval.type.toUpperCase()} {formatTime(nextInterval.duration_sec)}
              </span>
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={timer.reset}
            className="active-scale tap-target flex items-center justify-center w-14 h-14 rounded-full border-2 border-border bg-background shadow-sm"
            aria-label="Reset"
          >
            <RotateCcw className="w-6 h-6 text-foreground" />
          </button>

          {!timer.isRunning ? (
            <button
              type="button"
              onClick={timer.totalElapsed === 0 ? handleStart : handleResume}
              className={cn(
                "active-scale tap-target flex items-center justify-center w-20 h-20 rounded-full shadow-lg",
                isWalk ? "bg-primary" : "bg-success"
              )}
              aria-label={timer.totalElapsed === 0 ? "Start" : "Resume"}
            >
              <Play className="w-9 h-9 fill-white text-white ml-1" />
            </button>
          ) : (
            <button
              type="button"
              onClick={timer.pause}
              className={cn(
                "active-scale tap-target flex items-center justify-center w-20 h-20 rounded-full shadow-lg",
                isWalk ? "bg-primary" : "bg-success"
              )}
              aria-label="Pause"
            >
              <Pause className="w-9 h-9 fill-white text-white" />
            </button>
          )}

          {/* Spacer */}
          <div className="w-14 h-14" aria-hidden="true" />
        </div>

        {/* Form cue */}
        {timer.isRunning && (
          <div className="mt-8 px-5 py-2.5 rounded-xl bg-background/60 border border-border">
            <p className="text-xs text-muted-foreground text-center">
              💡 {FORM_CUES[cueIndex]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface SaveSectionProps {
  effort: number;
  notes: string;
  isSaving: boolean;
  saveError: string | null;
  savedSuccess: boolean;
  setEffort: (v: number) => void;
  setNotes: (v: string) => void;
  onSave: () => void;
}

function SaveSection({
  effort,
  notes,
  isSaving,
  saveError,
  savedSuccess,
  setEffort,
  setNotes,
  onSave,
}: SaveSectionProps) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
      <p className="text-sm font-semibold text-foreground">How was it?</p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Perceived Effort (RPE)
          </p>
          <span
            className={cn(
              "text-sm font-bold px-2.5 py-0.5 rounded-full",
              effort <= 3
                ? "bg-success/10 text-success"
                : effort <= 6
                ? "bg-warning/10 text-warning"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {effort}/10
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={effort}
          onChange={(e) => setEffort(parseInt(e.target.value, 10))}
          className="pain-slider w-full h-2 rounded-full appearance-none bg-muted cursor-pointer"
          style={
            {
              "--pain-thumb-color":
                effort <= 3
                  ? "hsl(142 71% 45%)"
                  : effort <= 6
                  ? "hsl(38 92% 50%)"
                  : "hsl(0 84.2% 60.2%)",
            } as React.CSSProperties
          }
        />
        <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
          <span>Easy</span>
          <span>Moderate</span>
          <span>Hard</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Notes (optional)</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did it feel? Any pain or issues?"
          rows={3}
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {saveError && <p className="text-xs text-destructive">{saveError}</p>}

      {savedSuccess ? (
        <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-success/10">
          <span className="text-sm font-semibold text-success">✓ Session saved!</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="active-scale w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Session"}
        </button>
      )}
    </div>
  );
}
