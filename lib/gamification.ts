// ========================================
// Gamification: levels, XP, ranks & achievements
//
// The four recovery phases are presented as LEVELS you progress through.
// Advancing a level (a "Level Up") is gated by real-world readiness criteria
// (see phases.json transitions + the weekly review) — NOT by XP. XP and ranks
// are a momentum/score layer that reward the daily work, and achievements
// celebrate milestones. Everything here is derived from logged data, so no
// extra database tables are required.
// ========================================

import phasesData from "@/lib/data/phases.json";

export interface GameInputs {
  strengthSessions: number;
  cervicalSessions: number;
  elbowSessions: number;
  runSessions: number;
  painEntries: number;
  weightEntries: number;
  weeklyReviews: number;
  streak: number;
  currentPhase: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide-react icon name, mapped in the UI
  test: (i: GameInputs) => boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface LevelInfo {
  number: number;
  name: string;
  tagline: string;
  color: string;
}

export interface NextLevelInfo {
  number: number;
  name: string;
  criteria: { id: string; label: string; type: "auto" | "manual" }[];
}

export interface GameStats {
  totalXp: number;
  level: number;
  levelName: string;
  levelTagline: string;
  levelColor: string;
  rank: number;
  rankTitle: string;
  xpIntoRank: number;
  xpPerRank: number;
  streak: number;
  counts: {
    strength: number;
    cervical: number;
    elbow: number;
    run: number;
    reviews: number;
  };
  achievements: Achievement[];
  unlockedCount: number;
  totalAchievements: number;
  nextLevel: NextLevelInfo | null;
  maxLevel: boolean;
}

// XP awarded per logged item
export const XP = {
  strengthSession: 25,
  rehabSession: 8, // cervical or elbow
  runSession: 15,
  painEntry: 3,
  weightEntry: 5,
  weeklyReview: 40,
  perStreakDay: 5,
  perLevelBonus: 200, // big reward for each level you've climbed
} as const;

export const XP_PER_RANK = 500;

export const LEVELS: LevelInfo[] = [
  { number: 1, name: "Reload", tagline: "Reintroduce loading safely", color: "#2563eb" },
  { number: 2, name: "Build", tagline: "Free-weight compounds + light runs", color: "#16a34a" },
  { number: 3, name: "Strength", tagline: "Heavier lifts, overhead returns", color: "#f59e0b" },
  { number: 4, name: "Perform", tagline: "Maintain, auto-regulate, thrive", color: "#7c3aed" },
];

// Cosmetic rank titles that scale with total XP
const RANK_TITLES = [
  "Rookie",
  "Apprentice",
  "Challenger",
  "Contender",
  "Athlete",
  "Veteran",
  "Champion",
  "Elite",
  "Master",
  "Legend",
];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_strength", name: "First Rep", description: "Log your first strength session", icon: "Dumbbell", test: (i) => i.strengthSessions >= 1 },
  { id: "strength_10", name: "Strong Start", description: "10 strength sessions logged", icon: "Dumbbell", test: (i) => i.strengthSessions >= 10 },
  { id: "strength_30", name: "Powerhouse", description: "30 strength sessions logged", icon: "Flame", test: (i) => i.strengthSessions >= 30 },
  { id: "streak_7", name: "One Week Strong", description: "Hit a 7-day activity streak", icon: "Flame", test: (i) => i.streak >= 7 },
  { id: "streak_30", name: "Locked In", description: "Hit a 30-day activity streak", icon: "Trophy", test: (i) => i.streak >= 30 },
  { id: "cervical_30", name: "Iron Neck", description: "30 cervical maintenance sessions", icon: "Shield", test: (i) => i.cervicalSessions >= 30 },
  { id: "elbow_20", name: "Tendon Tough", description: "20 elbow loading sessions", icon: "Hand", test: (i) => i.elbowSessions >= 20 },
  { id: "first_run", name: "On the Move", description: "Complete your first run session", icon: "Timer", test: (i) => i.runSessions >= 1 },
  { id: "run_10", name: "Light Feet", description: "10 run sessions logged", icon: "Footprints", test: (i) => i.runSessions >= 10 },
  { id: "first_review", name: "Self-Coach", description: "Complete a weekly review", icon: "ClipboardCheck", test: (i) => i.weeklyReviews >= 1 },
  { id: "level_2", name: "Level 2 Reached", description: "Level up to Build", icon: "ArrowUpCircle", test: (i) => i.currentPhase >= 2 },
  { id: "level_3", name: "Level 3 Reached", description: "Level up to Strength", icon: "ArrowUpCircle", test: (i) => i.currentPhase >= 3 },
  { id: "level_4", name: "Peak Form", description: "Reach the final level, Perform", icon: "Crown", test: (i) => i.currentPhase >= 4 },
];

export function computeXp(i: GameInputs): number {
  return (
    i.strengthSessions * XP.strengthSession +
    (i.cervicalSessions + i.elbowSessions) * XP.rehabSession +
    i.runSessions * XP.runSession +
    i.painEntries * XP.painEntry +
    i.weightEntries * XP.weightEntry +
    i.weeklyReviews * XP.weeklyReview +
    i.streak * XP.perStreakDay +
    Math.max(0, i.currentPhase - 1) * XP.perLevelBonus
  );
}

export function computeGameStats(i: GameInputs): GameStats {
  const totalXp = computeXp(i);
  const level = Math.min(4, Math.max(1, i.currentPhase));
  const levelInfo = LEVELS[level - 1];

  const rankIndex = Math.floor(totalXp / XP_PER_RANK);
  const rank = rankIndex + 1;
  const rankTitle = RANK_TITLES[Math.min(rankIndex, RANK_TITLES.length - 1)];
  const xpIntoRank = totalXp % XP_PER_RANK;

  const achievements: Achievement[] = ACHIEVEMENTS.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    icon: a.icon,
    unlocked: a.test(i),
  }));
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const transition = phasesData.transitions.find((t) => t.from === level);
  const nextLevel: NextLevelInfo | null =
    transition && level < 4
      ? {
          number: transition.to,
          name: LEVELS[transition.to - 1]?.name ?? "",
          criteria: transition.criteria as {
            id: string;
            label: string;
            type: "auto" | "manual";
          }[],
        }
      : null;

  return {
    totalXp,
    level,
    levelName: levelInfo.name,
    levelTagline: levelInfo.tagline,
    levelColor: levelInfo.color,
    rank,
    rankTitle,
    xpIntoRank,
    xpPerRank: XP_PER_RANK,
    streak: i.streak,
    counts: {
      strength: i.strengthSessions,
      cervical: i.cervicalSessions,
      elbow: i.elbowSessions,
      run: i.runSessions,
      reviews: i.weeklyReviews,
    },
    achievements,
    unlockedCount,
    totalAchievements: achievements.length,
    nextLevel,
    maxLevel: level >= 4,
  };
}
