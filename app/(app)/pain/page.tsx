import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateSG } from "@/lib/utils";
import { PainEntryForm } from "@/components/pain/pain-entry-form";
import type { PainEntry } from "@/types";
import { TrendingUp } from "lucide-react";

export const metadata = {
  title: "Pain | RecoverFlow",
};

export default async function PainPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const today = formatDateSG();

  const { data: todayEntries } = await supabase
    .from("pain_entries")
    .select("*")
    .eq("user_id", authUser.id)
    .eq("date", today)
    .order("created_at");

  return (
    <div className="space-y-4">
      {/* Header with nav */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pain Tracker</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Log and track your recovery progress
          </p>
        </div>
        <Link
          href="/pain/trends"
          className="active-scale flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Trends
        </Link>
      </div>

      {/* Tab-like nav */}
      <div className="flex rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex-1 bg-primary text-primary-foreground py-2.5 text-sm font-semibold text-center">
          Log Pain
        </div>
        <Link
          href="/pain/trends"
          className="active-scale flex-1 py-2.5 text-sm font-semibold text-center text-muted-foreground hover:bg-muted transition-colors"
        >
          View Trends
        </Link>
      </div>

      {/* Pain entry form */}
      <PainEntryForm existingEntries={(todayEntries as PainEntry[]) ?? []} />
    </div>
  );
}
