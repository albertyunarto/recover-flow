import { redirect } from "next/navigation";
import { getAuthUser, getUserProfile } from "@/lib/supabase/auth";
import { ImportWizard } from "@/components/import/import-wizard";
import { ExerciseReconcileList } from "@/components/import/exercise-reconcile-list";
import { getReconcileCandidates } from "@/lib/actions/imported-exercises";

export default async function ImportPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  const profile = await getUserProfile();
  const currentWeek = profile?.current_week ?? 1;
  const currentPhase = profile?.current_phase ?? 1;
  const candidates = await getReconcileCandidates(currentWeek);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Import Fitbit Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Export your data at{" "}
          <a
            href="https://takeout.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            takeout.google.com
          </a>{" "}
          (Fitbit category only), then drop the ZIP below. Re-importing
          overlapping dates is safe — nothing gets duplicated.
        </p>
      </div>
      <ImportWizard />
      <ExerciseReconcileList
        candidates={candidates}
        currentPhase={currentPhase}
      />
    </div>
  );
}
