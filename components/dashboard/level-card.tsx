import Link from "next/link";
import { Flame, Trophy, Award, ChevronRight, Sparkles } from "lucide-react";
import { getGameStats } from "@/lib/actions/gamification";

export async function LevelCard() {
  const stats = await getGameStats();
  if (!stats) return null;

  const xpPct = Math.round((stats.xpIntoRank / stats.xpPerRank) * 100);
  const xpToNext = stats.xpPerRank - stats.xpIntoRank;

  return (
    <div
      className="rounded-2xl border p-4 shadow-sm text-white relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${stats.levelColor} 0%, ${stats.levelColor}cc 100%)`,
      }}
    >
      {/* subtle glow */}
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />

      <div className="relative flex items-center gap-4">
        {/* Level badge */}
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
            Level
          </span>
          <span className="text-2xl font-black leading-none">{stats.level}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-bold leading-tight">{stats.levelName}</h2>
            {stats.maxLevel && <Sparkles className="h-4 w-4" />}
          </div>
          <p className="text-xs text-white/80 leading-tight">{stats.levelTagline}</p>
          <div className="mt-1 flex items-center gap-3 text-xs font-medium">
            <span className="inline-flex items-center gap-1">
              <Award className="h-3.5 w-3.5" />
              {stats.rankTitle}
            </span>
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" />
              {stats.streak}d streak
            </span>
          </div>
        </div>
      </div>

      {/* XP bar */}
      <div className="relative mt-3">
        <div className="flex items-center justify-between text-xs font-medium mb-1">
          <span>{stats.totalXp.toLocaleString()} XP</span>
          <span className="text-white/80">{xpToNext} XP to next reward</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/20">
          <div
            className="h-full rounded-full bg-white transition-all duration-700"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>

      {/* Footer row */}
      <div className="relative mt-3 flex items-center justify-between">
        <Link
          href="/progress"
          className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur active-scale"
        >
          <Trophy className="h-3.5 w-3.5" />
          {stats.unlockedCount}/{stats.totalAchievements} badges
        </Link>

        {stats.nextLevel ? (
          <Link
            href="/progress/review"
            className="inline-flex items-center gap-1 text-xs font-semibold active-scale"
          >
            Next: Lv {stats.nextLevel.number} {stats.nextLevel.name}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="text-xs font-semibold">Final level — maintain it 💪</span>
        )}
      </div>
    </div>
  );
}
