"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FireInputs, FireProfile } from "@/types";

// Columns persisted for a plan (everything in FireInputs).
const FIRE_FIELDS: (keyof FireInputs)[] = [
  "monthly_income",
  "annual_bonus",
  "current_age",
  "target_retire_age",
  "life_expectancy",
  "monthly_expenses",
  "current_invested",
  "current_cash",
  "cpf_oa",
  "cpf_sa",
  "cpf_ma",
  "monthly_etf_contribution",
  "rsu_annual_grant",
  "rsu_vest_years",
  "rsu_unvested_value",
  "expected_return_pct",
  "inflation_pct",
  "swr_pct",
  "target_retirement_sum",
  "cpf_life_plan",
  "include_cpf_life",
];

export async function getFireProfile(): Promise<FireProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from("fire_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Table not migrated yet — fall back to defaults in the UI.
    if (error) return null;
    return (data as FireProfile) ?? null;
  } catch {
    return null;
  }
}

export async function saveFireProfile(
  input: FireInputs
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Whitelist + coerce so the client can't write arbitrary columns.
  const row: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
  for (const key of FIRE_FIELDS) {
    row[key] = input[key];
  }

  const { error } = await supabase
    .from("fire_profiles")
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    return {
      error: error.message.includes("fire_profiles")
        ? "Plan storage not set up yet — run the fire_profiles migration in Supabase."
        : error.message,
    };
  }

  revalidatePath("/fire");
  revalidatePath("/dashboard");
  return { success: true };
}
