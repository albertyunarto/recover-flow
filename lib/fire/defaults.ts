import type { FireInputs, FireProfile } from "@/types";

// Starting point for a new plan — a plausible mid-career Singapore profile.
// Every value is editable in the planner; these just give a sensible canvas.
export const DEFAULT_FIRE_INPUTS: FireInputs = {
  monthly_income: 8000,
  annual_bonus: 16000,

  current_age: 32,
  target_retire_age: 50,
  life_expectancy: 90,

  monthly_expenses: 4000,

  current_invested: 80000,
  current_cash: 30000,
  cpf_oa: 50000,
  cpf_sa: 35000,
  cpf_ma: 30000,

  monthly_etf_contribution: 2500,

  rsu_annual_grant: 20000,
  rsu_vest_years: 4,
  rsu_unvested_value: 40000,

  expected_return_pct: 7,
  inflation_pct: 2.5,
  swr_pct: 4,

  target_retirement_sum: "FRS",
  cpf_life_plan: "standard",
  include_cpf_life: true,
};

// Supabase returns numeric columns as strings — coerce a stored profile into a
// clean FireInputs, falling back to defaults for any missing/invalid field.
export function profileToInputs(p: FireProfile): FireInputs {
  const num = (v: unknown, fallback: number) => {
    const parsed = parseFloat(String(v));
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const d = DEFAULT_FIRE_INPUTS;
  return {
    monthly_income: num(p.monthly_income, d.monthly_income),
    annual_bonus: num(p.annual_bonus, d.annual_bonus),
    current_age: num(p.current_age, d.current_age),
    target_retire_age: num(p.target_retire_age, d.target_retire_age),
    life_expectancy: num(p.life_expectancy, d.life_expectancy),
    monthly_expenses: num(p.monthly_expenses, d.monthly_expenses),
    current_invested: num(p.current_invested, d.current_invested),
    current_cash: num(p.current_cash, d.current_cash),
    cpf_oa: num(p.cpf_oa, d.cpf_oa),
    cpf_sa: num(p.cpf_sa, d.cpf_sa),
    cpf_ma: num(p.cpf_ma, d.cpf_ma),
    monthly_etf_contribution: num(p.monthly_etf_contribution, d.monthly_etf_contribution),
    rsu_annual_grant: num(p.rsu_annual_grant, d.rsu_annual_grant),
    rsu_vest_years: num(p.rsu_vest_years, d.rsu_vest_years),
    rsu_unvested_value: num(p.rsu_unvested_value, d.rsu_unvested_value),
    expected_return_pct: num(p.expected_return_pct, d.expected_return_pct),
    inflation_pct: num(p.inflation_pct, d.inflation_pct),
    swr_pct: num(p.swr_pct, d.swr_pct),
    target_retirement_sum: p.target_retirement_sum ?? d.target_retirement_sum,
    cpf_life_plan: p.cpf_life_plan ?? d.cpf_life_plan,
    include_cpf_life: p.include_cpf_life ?? d.include_cpf_life,
  };
}
