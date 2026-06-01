import { getAuthUser } from "@/lib/supabase/auth";
import { getFireProfile } from "@/lib/actions/fire";
import { DEFAULT_FIRE_INPUTS, profileToInputs } from "@/lib/fire/defaults";
import { FirePlanner } from "@/components/fire/fire-planner";

export default async function FirePage() {
  const user = await getAuthUser();
  if (!user) return null;

  const profile = await getFireProfile();
  const initial = profile ? profileToInputs(profile) : DEFAULT_FIRE_INPUTS;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">FIRE Planner</h1>
        <p className="text-sm text-muted-foreground">
          Singapore-style financial independence — CPF LIFE, ETFs & RSUs in one
          projection.
        </p>
      </div>
      <FirePlanner initial={initial} />
    </div>
  );
}
