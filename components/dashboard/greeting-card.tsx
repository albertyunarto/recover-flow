import { getGreeting } from "@/lib/utils";

const PHASE_NAMES: Record<number, string> = {
  1: "Foundation",
  2: "Build",
  3: "Advance",
  4: "5K Ready",
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
        {today} &middot; Week {week}, Phase {phase} — {PHASE_NAMES[phase]}
      </p>
    </div>
  );
}
