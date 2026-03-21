import { createClient } from "@/lib/supabase/server";
import { formatDateSG } from "@/lib/utils";
import { PainEntryForm } from "@/components/pain/pain-entry-form";
import type { PainEntry } from "@/types";

export const metadata = {
  title: "Log Pain | RecoverFlow",
};

export default async function PainLogPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const today = formatDateSG();

  const { data: todayEntries } = await supabase
    .from("pain_entries")
    .select("*")
    .eq("user_id", authUser.id)
    .eq("date", today)
    .order("created_at");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pain Check-in</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Rate each area 0 (no pain) to 10 (worst imaginable)
        </p>
      </div>

      <PainEntryForm existingEntries={(todayEntries as PainEntry[]) ?? []} />
    </div>
  );
}
