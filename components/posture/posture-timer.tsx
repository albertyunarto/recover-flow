"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, Pause, Play, RotateCcw, X } from "lucide-react";

const POSTURE_EXERCISES = [
  "Do 5 chin tucks (hold 5 sec each)",
  "Do 5 shoulder rolls (forward then backward)",
  "Stand and stretch arms overhead for 10 sec",
  "Gently rotate neck left and right (5 each side)",
  "Squeeze shoulder blades together 5 times (hold 3 sec)",
];

const INTERVAL_SEC = 30 * 60; // 30 minutes

export function PostureTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(INTERVAL_SEC);
  const [showExercise, setShowExercise] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearTimer();
            setIsRunning(false);
            setShowExercise(true);
            setCurrentExercise(
              Math.floor(Math.random() * POSTURE_EXERCISES.length)
            );
            // Try to vibrate
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return clearTimer;
  }, [isRunning, timeRemaining, clearTimer]);

  function start() {
    if (timeRemaining === 0) {
      setTimeRemaining(INTERVAL_SEC);
    }
    setIsRunning(true);
    setShowExercise(false);
  }

  function pause() {
    setIsRunning(false);
    clearTimer();
  }

  function reset() {
    setIsRunning(false);
    clearTimer();
    setTimeRemaining(INTERVAL_SEC);
    setShowExercise(false);
  }

  function dismissExercise() {
    setShowExercise(false);
    setTimeRemaining(INTERVAL_SEC);
    setIsRunning(true);
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const pct = ((INTERVAL_SEC - timeRemaining) / INTERVAL_SEC) * 100;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-4 z-40 flex items-center gap-1.5 rounded-full bg-card border shadow-lg px-3 py-2 text-xs font-medium active-scale"
      >
        <Clock className="h-3.5 w-3.5 text-primary" />
        Posture
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 md:bottom-4 z-40 w-64 rounded-xl border bg-card shadow-xl">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">Posture Break Timer</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="tap-target flex items-center justify-center"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {showExercise ? (
          <div className="space-y-2">
            <div className="rounded-lg bg-primary/10 p-3">
              <p className="text-xs font-medium text-primary mb-1">
                Time for a posture break!
              </p>
              <p className="text-sm">{POSTURE_EXERCISES[currentExercise]}</p>
            </div>
            <button
              onClick={dismissExercise}
              className="w-full rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground active:scale-95"
            >
              Done — Restart Timer
            </button>
          </div>
        ) : (
          <>
            <div className="text-center">
              <span className="text-2xl font-bold tabular-nums">
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </span>
            </div>

            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex justify-center gap-2">
              {isRunning ? (
                <button
                  onClick={pause}
                  className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium active-scale"
                >
                  <Pause className="h-3 w-3" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={start}
                  className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground active-scale"
                >
                  <Play className="h-3 w-3" />
                  {timeRemaining === INTERVAL_SEC ? "Start" : "Resume"}
                </button>
              )}
              <button
                onClick={reset}
                className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium active-scale"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
