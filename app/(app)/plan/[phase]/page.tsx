import Link from "next/link";
import { ArrowLeft, Target, Ban, Apple } from "lucide-react";
import planContent from "@/lib/data/plan-content/overview.json";

interface PhaseParams {
  params: Promise<{ phase: string }>;
}

export default async function PhaseDetailPage({ params }: PhaseParams) {
  const { phase: phaseStr } = await params;
  const phaseNum = parseInt(phaseStr);
  const phase = planContent.phases.find((p) => p.phase === phaseNum);

  if (!phase) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Phase not found</p>
      </div>
    );
  }

  // Try to load protocol data for this phase
  let protocols: { protocol: string; exercises: { id: string; name: string; sets: number; reps: number; hold_sec: number; form_cue: string; why: string }[] }[] = [];
  try {
    const data = await import(
      `@/lib/data/protocols/phase-${phaseNum}.json`
    ).then((m) => m.default);
    protocols = data.protocols || [];
  } catch {
    // Protocol data not available
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/plan"
          className="tap-target flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">
            Phase {phase.phase}: {phase.name}
          </h1>
          <p className="text-sm text-muted-foreground">{phase.weeks}</p>
        </div>
      </div>

      {/* Focus */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Focus</h2>
        </div>
        <p className="text-sm text-muted-foreground">{phase.focus}</p>
      </div>

      {/* Principles */}
      {"principles" in phase && phase.principles && (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold">Key Principles</h2>
          <ul className="space-y-1.5">
            {(phase.principles as string[]).map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="text-primary mt-1">•</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Protocols */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Exercise Protocols</h2>
        {protocols.length > 0 ? (
          protocols.map((proto) => (
            <div
              key={proto.protocol}
              className="rounded-xl border bg-card p-4 shadow-sm space-y-3"
            >
              <h3 className="text-sm font-semibold capitalize">
                {proto.protocol.replace("_", " ")} Protocol
              </h3>
              <div className="space-y-2">
                {proto.exercises.map((ex) => (
                  <div key={ex.id} className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium">{ex.name}</p>
                      <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {ex.sets}×{ex.reps}
                        {ex.hold_sec > 0 ? `, ${ex.hold_sec}s hold` : ""}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ex.form_cue}
                    </p>
                    <p className="text-xs text-primary/70 mt-1 italic">
                      Why: {ex.why}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-1">
            {phase.protocols.map((p, i) => (
              <div
                key={i}
                className="rounded-lg bg-muted/50 px-3 py-2 text-sm"
              >
                {p}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Things to Avoid */}
      {"avoid" in phase && phase.avoid && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold text-destructive">Avoid</h2>
          </div>
          <ul className="space-y-1">
            {(phase.avoid as string[]).map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="text-destructive">×</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nutrition Guidelines */}
      {"nutrition" in phase && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Apple className="h-4 w-4 text-success" />
            <h2 className="text-sm font-semibold">Nutrition</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {phase.nutrition as string}
          </p>
        </div>
      )}
    </div>
  );
}
