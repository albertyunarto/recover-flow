import { getAuthUser, getUserProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateSG } from "@/lib/utils";
import { FoodJournal } from "@/components/nutrition/food-journal";
import Link from "next/link";
import { Search } from "lucide-react";

export default async function NutritionLogPage() {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const today = formatDateSG();

  const [profile, { data: entries }] = await Promise.all([
    getUserProfile(),
    supabase
      .from("nutrition_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .order("created_at"),
  ]);

  const calTarget = profile?.daily_calorie_target ?? 1850;
  const protTarget = profile?.daily_protein_target ?? 140;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Food Journal</h1>
        <Link
          href="/nutrition/log/browse"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          Browse foods
        </Link>
      </div>
      <FoodJournal
        entries={entries ?? []}
        calTarget={calTarget}
        protTarget={protTarget}
      />
    </div>
  );
}
