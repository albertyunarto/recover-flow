"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatDateSG } from "@/lib/utils";

export async function logWater() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const today = formatDateSG();

  // Try to get existing log for today
  const { data: existing } = await supabase
    .from("hydration_logs")
    .select()
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (existing) {
    await supabase
      .from("hydration_logs")
      .update({ glasses: existing.glasses + 1 })
      .eq("id", existing.id);
  } else {
    await supabase.from("hydration_logs").insert({
      user_id: user.id,
      date: today,
      glasses: 1,
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}
