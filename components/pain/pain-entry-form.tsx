"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { cn, getTimePeriod, getPainColor, getPainBgColor } from "@/lib/utils";
import { logPain } from "@/lib/actions/pain";
import type { PainEntry, PainRegion } from "@/types";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

interface PainRegionConfig {
  key: PainRegion;
  label: string;
  scoreField: keyof Pick<
    PainEntry,
    "neck_score" | "back_score" | "elbow_score" | "knee_score"
  >;
  icon: string;
  description: string;
  accentColor: string;
}

const PAIN_REGIONS: PainRegionConfig[] = [
  {
    key: "neck",
    label: "Neck / Shoulder",
    scoreField: "neck_score",
    icon: "🫀",
    description: "Cervical spine & shoulder area",
    accentColor: "hsl(221 83% 53%)",
  },
  {
    key: "back",
    label: "Upper Back / Traps",
    scoreField: "back_score",
    icon: "🦴",
    description: "Thoracic & trapezius area",
    accentColor: "hsl(262 83% 58%)",
  },
  {
    key: "elbow",
    label: "Left Elbow",
    scoreField: "elbow_score",
    icon: "💪",
    description: "Lateral epicondyle & forearm",
    accentColor: "hsl(38 92% 50%)",
  },
  {
    key: "knee",
    label: "Knee / Feet",
    scoreField: "knee_score",
    icon: "🦵",
    description: "Knee joint & plantar fascia",
    accentColor: "hsl(142 71% 45%)",
  },
];

function getPainLabel(score: number): string {
  if (score === 0) return "No pain";
  if (score <= 2) return "Minimal";
  if (score <= 4) return "Mild";
  if (score <= 6) return "Moderate";
  if (score <= 8) return "Severe";
  return "Worst imaginable";
}

function getSliderTrackColor(score: number): string {
  if (score <= 3) return "hsl(142 71% 45%)";
  if (score <= 6) return "hsl(38 92% 50%)";
  return "hsl(0 84.2% 60.2%)";
}

interface PainSliderProps {
  name: string;
  value: number;
  onChange: (value: number) => void;
}

function PainSlider({ name, value, onChange }: PainSliderProps) {
  const trackColor = getSliderTrackColor(value);
  const pct = (value / 10) * 100;

  return (
    <div className="relative py-2">
      <input
        type="range"
        name={name}
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="pain-slider w-full h-2 rounded-full appearance-none cursor-pointer"
        style={
          {
            background: `linear-gradient(to right, ${trackColor} 0%, ${trackColor} ${pct}%, hsl(214.3 31.8% 91.4%) ${pct}%, hsl(214.3 31.8% 91.4%) 100%)`,
            "--pain-thumb-color": trackColor,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

interface PainEntryFormProps {
  existingEntries: PainEntry[];
}

export function PainEntryForm({ existingEntries }: PainEntryFormProps) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const defaultPeriod = getTimePeriod();
  const [timePeriod, setTimePeriod] = useState<"AM" | "PM">(defaultPeriod);

  // Find existing entry for the currently selected period
  const existingEntry = existingEntries.find(
    (e) => e.time_of_day === timePeriod
  );

  const [scores, setScores] = useState({
    neck: existingEntry?.neck_score ?? 0,
    back: existingEntry?.back_score ?? 0,
    elbow: existingEntry?.elbow_score ?? 0,
    knee: existingEntry?.knee_score ?? 0,
  });
  const [notes, setNotes] = useState(existingEntry?.notes ?? "");

  // Update scores when switching AM/PM to pre-fill from existing
  const prevPeriodRef = useRef(timePeriod);
  useEffect(() => {
    if (prevPeriodRef.current !== timePeriod) {
      prevPeriodRef.current = timePeriod;
      const entry = existingEntries.find((e) => e.time_of_day === timePeriod);
      setScores({
        neck: entry?.neck_score ?? 0,
        back: entry?.back_score ?? 0,
        elbow: entry?.elbow_score ?? 0,
        knee: entry?.knee_score ?? 0,
      });
      setNotes(entry?.notes ?? "");
      setSubmitted(false);
      setError(null);
    }
  }, [timePeriod, existingEntries]);

  function handleScoreChange(region: keyof typeof scores, value: number) {
    setScores((prev) => ({ ...prev, [region]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    // Ensure time_of_day is set from state (not just form default)
    formData.set("time_of_day", timePeriod);

    startTransition(async () => {
      const result = await logPain(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSubmitted(true);
      }
    });
  }

  const hasExistingEntry = !!existingEntry;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {/* AM / PM toggle */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Time of Day
        </p>
        <div className="flex gap-2">
          {(["AM", "PM"] as const).map((period) => {
            const hasLog = existingEntries.some((e) => e.time_of_day === period);
            return (
              <button
                key={period}
                type="button"
                onClick={() => setTimePeriod(period)}
                className={cn(
                  "active-scale flex-1 py-3 rounded-lg text-sm font-semibold border transition-colors relative",
                  timePeriod === period
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted"
                )}
              >
                {period}
                {hasLog && (
                  <span
                    className={cn(
                      "absolute top-1.5 right-1.5 w-2 h-2 rounded-full",
                      timePeriod === period ? "bg-primary-foreground/60" : "bg-primary"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
        {hasExistingEntry && !submitted && (
          <div className="mt-3 flex items-center gap-2 text-xs text-warning">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>You have a {timePeriod} entry — submitting will update it.</span>
          </div>
        )}
      </div>

      {/* Pain region sliders */}
      {PAIN_REGIONS.map((region) => {
        const score =
          scores[region.key as keyof typeof scores];
        return (
          <div
            key={region.key}
            className="rounded-xl border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden>
                    {region.icon}
                  </span>
                  <span className="font-semibold text-sm">{region.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-7">
                  {region.description}
                </p>
              </div>
              <div
                className={cn(
                  "flex flex-col items-center rounded-lg px-3 py-1.5 min-w-[56px]",
                  getPainBgColor(score)
                )}
              >
                <span
                  className={cn("text-2xl font-bold leading-none", getPainColor(score))}
                >
                  {score}
                </span>
                <span className={cn("text-[10px] font-medium mt-0.5", getPainColor(score))}>
                  {getPainLabel(score)}
                </span>
              </div>
            </div>

            {/* Tick marks */}
            <div className="flex justify-between px-0.5 mb-1">
              {Array.from({ length: 11 }, (_, i) => (
                <span key={i} className="text-[9px] text-muted-foreground w-4 text-center">
                  {i}
                </span>
              ))}
            </div>

            <PainSlider
              name={`${region.key}_score`}
              value={score}
              onChange={(val) =>
                handleScoreChange(region.key as keyof typeof scores, val)
              }
            />
          </div>
        );
      })}

      {/* Notes */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <label
          htmlFor="pain-notes"
          className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block"
        >
          Notes (optional)
        </label>
        <textarea
          id="pain-notes"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any specific symptoms, triggers, or observations..."
          rows={3}
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Hidden time_of_day field */}
      <input type="hidden" name="time_of_day" value={timePeriod} />

      {/* Status messages */}
      {submitted && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success font-medium">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Pain logged for {timePeriod}. Great job tracking!</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "active-scale w-full py-4 rounded-xl font-semibold text-sm transition-colors",
          "bg-primary text-primary-foreground",
          "disabled:opacity-60 disabled:cursor-not-allowed"
        )}
      >
        {isPending
          ? "Saving..."
          : submitted
          ? `Update ${timePeriod} Entry`
          : `Log ${timePeriod} Pain`}
      </button>
    </form>
  );
}
