"use client";

import { useRef, useCallback } from "react";

export function useAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  function getOrCreateContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new AudioContext();
      } catch {
        return null;
      }
    }
    // Resume if suspended (browsers require user gesture to resume)
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }

  function playTone(
    ctx: AudioContext,
    frequency: number,
    durationMs: number,
    startTime: number = 0,
    gainValue: number = 0.4
  ): number {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + startTime);

    gainNode.gain.setValueAtTime(gainValue, ctx.currentTime + startTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + startTime + durationMs / 1000
    );

    oscillator.start(ctx.currentTime + startTime);
    oscillator.stop(ctx.currentTime + startTime + durationMs / 1000 + 0.01);

    return startTime + durationMs / 1000;
  }

  /**
   * Walk → Run transition: single beep at 880Hz for 200ms
   */
  const playWalkToRun = useCallback(() => {
    const ctx = getOrCreateContext();
    if (!ctx) return;
    playTone(ctx, 880, 200);
    try {
      navigator.vibrate?.(200);
    } catch {}
  }, []);

  /**
   * Run → Walk transition: double beep at 880Hz, 100ms each
   */
  const playRunToWalk = useCallback(() => {
    const ctx = getOrCreateContext();
    if (!ctx) return;
    playTone(ctx, 880, 100, 0);
    playTone(ctx, 880, 100, 0.15);
    try {
      navigator.vibrate?.([100, 50, 100]);
    } catch {}
  }, []);

  /**
   * Session complete: longer descending tone
   */
  const playComplete = useCallback(() => {
    const ctx = getOrCreateContext();
    if (!ctx) return;
    playTone(ctx, 880, 150, 0);
    playTone(ctx, 1100, 150, 0.2);
    playTone(ctx, 1320, 400, 0.4);
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {}
  }, []);

  /**
   * Call this from a user interaction (button click) to unlock AudioContext
   */
  const initAudio = useCallback(() => {
    getOrCreateContext();
  }, []);

  return {
    playWalkToRun,
    playRunToWalk,
    playComplete,
    initAudio,
  };
}
