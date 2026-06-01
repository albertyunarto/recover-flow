import { getGreeting } from "@/lib/utils";

const PHASE_NAMES: Record<number, string> = {
  1: "Reload",
  2: "Build",
  3: "Strength",
  4: "Perform",
};

export function GreetingCard({
  name,
  phase,
  week,
}: {
  name: string;
  phase: number;
  week: number;
}) {
  const greeting = getGreeting();
  const today = new Date().toLocaleDateString("en-SG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Singapore",
  });

  return (
    <div className="space-y-1">
      <h1 className="text-xl font-bold">
        {greeting}, {name}
      </h1>
      <p className="text-sm text-muted-foreground">
        {today} &middot; Level {phase}: {PHASE_NAMES[phase]} &middot; Week {week}
      </p>
    </div>
  );
}
