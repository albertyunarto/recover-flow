"use client";

import { useState, useTransition } from "react";
import { updateTargets, updatePhase } from "@/lib/actions/user";
import type { User } from "@/types";

export function SettingsForm({ profile }: { profile: User }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleTargets(formData: FormData) {
    startTransition(async () => {
      const result = await updateTargets(formData);
      setMessage(result.error ?? "Targets updated!");
      setTimeout(() => setMessage(null), 3000);
    });
  }

  function handlePhase(formData: FormData) {
    startTransition(async () => {
      const result = await updatePhase(formData);
      setMessage(result.error ?? "Phase updated!");
      setTimeout(() => setMessage(null), 3000);
    });
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      )}

      {/* Daily Targets */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <h2 className="text-sm font-medium">Daily Targets</h2>
        <form action={handleTargets} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Calories (kcal)
              </label>
              <input
                name="daily_calorie_target"
                type="number"
                defaultValue={profile.daily_calorie_target}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Protein (g)
              </label>
              <input
                name="daily_protein_target"
                type="number"
                defaultValue={profile.daily_protein_target}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Water (ml)</label>
            <input
              name="daily_water_target_ml"
              type="number"
              defaultValue={profile.daily_water_target_ml}
              step={250}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Targets"}
          </button>
        </form>
      </div>

      {/* Phase Override */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <h2 className="text-sm font-medium">Phase & Week Override</h2>
        <p className="text-xs text-muted-foreground">
          For development/testing. Normally use the weekly review to advance
          phases.
        </p>
        <form action={handlePhase} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Phase</label>
              <select
                name="phase"
                defaultValue={profile.current_phase}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value={1}>Level 1 — Reload</option>
                <option value={2}>Level 2 — Build</option>
                <option value={3}>Level 3 — Strength</option>
                <option value={4}>Level 4 — Perform</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Week</label>
              <input
                name="week"
                type="number"
                min={1}
                max={16}
                defaultValue={profile.current_week}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Update Phase"}
          </button>
        </form>
      </div>

      {/* Profile Info */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
        <h2 className="text-sm font-medium">Profile</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Height</span>
            <p>{profile.height_cm ?? "—"} cm</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Start Weight</span>
            <p>{profile.start_weight_kg ?? "—"} kg</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">
              Target Weight
            </span>
            <p>{profile.target_weight_kg ?? "—"} kg</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Plan Start</span>
            <p>{profile.plan_start_date ?? "Not set"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
