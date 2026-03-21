"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export interface TimerInterval {
  type: "walk" | "run";
  duration_sec: number;
}

export interface TimerState {
  currentInterval: TimerInterval | null;
  timeRemaining: number;
  totalElapsed: number;
  isRunning: boolean;
  currentCycle: number;
  totalCycles: number;
  currentIntervalIndex: number;
  isComplete: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useTimer(intervals: TimerInterval[]): TimerState {
  const [currentIntervalIndex, setCurrentIntervalIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(
    intervals.length > 0 ? intervals[0].duration_sec : 0
  );
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const timeRemainingRef = useRef(timeRemaining);
  const totalElapsedRef = useRef(0);
  const currentIndexRef = useRef(0);
  const onIntervalChangeRef = useRef<((index: number) => void) | null>(null);

  // Keep refs in sync
  timeRemainingRef.current = timeRemaining;
  currentIndexRef.current = currentIntervalIndex;

  // Calculate cycle info
  // Each cycle = one walk + one run interval pair
  // intervals array: [walk, run, walk, run, ...] for structured runs
  // totalCycles is derived from the intervals length / 2 (or passed externally)
  const totalCycles = Math.ceil(intervals.length / 2);
  const currentCycle = Math.ceil((currentIntervalIndex + 1) / 2);

  const tick = useCallback(
    (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      const newRemaining = timeRemainingRef.current - delta;
      const newElapsed = totalElapsedRef.current + delta;
      totalElapsedRef.current = newElapsed;

      if (newRemaining <= 0) {
        // Advance to next interval
        const nextIndex = currentIndexRef.current + 1;
        if (nextIndex >= intervals.length) {
          // Session complete
          setTimeRemaining(0);
          setTotalElapsed(newElapsed);
          setIsRunning(false);
          setIsComplete(true);
          lastTimestampRef.current = null;
          return;
        }
        const nextInterval = intervals[nextIndex];
        const carry = Math.abs(newRemaining);
        const nextRemaining = nextInterval.duration_sec - carry;
        timeRemainingRef.current = Math.max(0, nextRemaining);
        currentIndexRef.current = nextIndex;
        setCurrentIntervalIndex(nextIndex);
        setTimeRemaining(Math.max(0, nextRemaining));
        setTotalElapsed(newElapsed);
        onIntervalChangeRef.current?.(nextIndex);
      } else {
        timeRemainingRef.current = newRemaining;
        setTimeRemaining(newRemaining);
        setTotalElapsed(newElapsed);
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [intervals]
  );

  const start = useCallback(() => {
    if (intervals.length === 0 || isComplete) return;
    lastTimestampRef.current = null;
    setIsRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [intervals, isComplete, tick]);

  const pause = useCallback(() => {
    setIsRunning(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimestampRef.current = null;
  }, []);

  const resume = useCallback(() => {
    if (isComplete) return;
    lastTimestampRef.current = null;
    setIsRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [isComplete, tick]);

  const reset = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimestampRef.current = null;
    currentIndexRef.current = 0;
    timeRemainingRef.current = intervals.length > 0 ? intervals[0].duration_sec : 0;
    totalElapsedRef.current = 0;
    setCurrentIntervalIndex(0);
    setTimeRemaining(intervals.length > 0 ? intervals[0].duration_sec : 0);
    setTotalElapsed(0);
    setIsRunning(false);
    setIsComplete(false);
  }, [intervals]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const currentInterval = intervals[currentIntervalIndex] ?? null;

  return {
    currentInterval,
    timeRemaining,
    totalElapsed,
    isRunning,
    currentCycle,
    totalCycles,
    currentIntervalIndex,
    isComplete,
    start,
    pause,
    resume,
    reset,
  };
}
