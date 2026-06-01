import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SG_TIMEZONE = "Asia/Singapore";

export function formatDateSG(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: SG_TIMEZONE });
}

export function getTimePeriod(): "AM" | "PM" {
  const hour = new Date().toLocaleString("en-US", {
    timeZone: SG_TIMEZONE,
    hour: "numeric",
    hour12: false,
  });
  return parseInt(hour) < 12 ? "AM" : "PM";
}

export function getCurrentWeek(planStartDate: string): number {
  const start = new Date(planStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(24, Math.floor(diffDays / 7) + 1));
}

export function getGreeting(): string {
  const hour = new Date().toLocaleString("en-US", {
    timeZone: SG_TIMEZONE,
    hour: "numeric",
    hour12: false,
  });
  const h = parseInt(hour);
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sorted = [...new Set(dates)].sort().reverse();
  const today = formatDateSG();

  if (sorted[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (sorted[0] !== formatDateSG(yesterday)) return 0;
  }

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const curr = new Date(sorted[i - 1]);
    const prev = new Date(sorted[i]);
    const diffDays = Math.floor(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}

export function formatWeight(kg: number): string {
  return `${kg.toFixed(1)} kg`;
}

const SGD = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0,
});

// Full SGD amount, e.g. $1,234,567. Infinity renders as a dash.
export function formatSGD(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return SGD.format(Math.round(amount));
}

// Compact SGD for axes/cards, e.g. $1.2M, $84k.
export function formatSGDShort(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function getPainColor(score: number): string {
  if (score <= 3) return "text-success";
  if (score <= 6) return "text-warning";
  return "text-destructive";
}

export function getPainBgColor(score: number): string {
  if (score <= 3) return "bg-success/10";
  if (score <= 6) return "bg-warning/10";
  return "bg-destructive/10";
}

export function getAdherenceColor(pct: number): string {
  if (pct >= 80) return "text-success";
  if (pct >= 60) return "text-warning";
  return "text-destructive";
}

export function inferMealType(): "breakfast" | "lunch" | "dinner" | "snack" {
  const hour = parseInt(
    new Date().toLocaleString("en-US", {
      timeZone: SG_TIMEZONE,
      hour: "numeric",
      hour12: false,
    })
  );
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "snack";
  return "dinner";
}
