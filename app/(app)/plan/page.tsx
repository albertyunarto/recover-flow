import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  AlertTriangle,
  Shield,
  Link2,
  Monitor,
} from "lucide-react";
import planContent from "@/lib/data/plan-content/overview.json";

const PHASE_COLORS: Record<number, string> = {
  1: "border-l-[#2563eb]",
  2: "border-l-[#16a34a]",
  3: "border-l-[#f59e0b]",
  4: "border-l-[#7c3aed]",
};

const PHASE_BG: Record<number, string> = {
  1: "bg-[#2563eb]/5",
  2: "bg-[#16a34a]/5",
  3: "bg-[#f59e0b]/5",
  4: "bg-[#7c3aed]/5",
};

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("current_phase, current_week")
    .eq("id", user.id)
    .single();

  const currentPhase = profile?.current_phase ?? 1;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">{planContent.title}</h1>
        <p className="text-sm text-muted-foreground">{planContent.subtitle}</p>
      </div>

      {/* The C6 Connection */}
      <div className="rounded-xl border-l-4 border-l-primary bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">
            {planContent.the_c6_connection.title}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {planContent.the_c6_connection.content}
        </p>
      </div>

      {/* Phase Cards */}
      <div className="space-y-3">
        {planContent.phases.map((phase) => {
          const isCurrent = phase.phase === currentPhase;
          const isPast = phase.phase < currentPhase;

          return (
            <Link
              key={phase.phase}
              href={`/plan/${phase.phase}`}
              className={`block rounded-xl border-l-4 ${PHASE_COLORS[phase.phase]} ${
                isCurrent ? PHASE_BG[phase.phase] : ""
              } border bg-card p-4 shadow-sm active-scale`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    Phase {phase.phase}: {phase.name}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                      Current
                    </span>
                  )}
                  {isPast && (
                    <span className="text-xs text-success font-medium">
                      Completed
                    </span>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {phase.weeks}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {phase.focus}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {phase.protocols.map((p, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Warning Signs */}
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h2 className="text-sm font-semibold text-destructive">
            Warning Signs — Stop & Seek Help
          </h2>
        </div>
        <div className="space-y-2">
          {planContent.warning_signs.map((ws, i) => (
            <div key={i} className="text-sm">
              <p className="font-medium">{ws.sign}</p>
              <p className="text-xs text-muted-foreground">{ws.action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ergonomic Checklist */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Ergonomic Checklist</h2>
        </div>
        <div className="space-y-1.5">
          {planContent.ergonomic_checklist.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Shield className="h-3.5 w-3.5 mt-0.5 text-success flex-shrink-0" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
