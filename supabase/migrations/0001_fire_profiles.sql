-- Migration: FIRE planner profile table
-- Run this in the Supabase SQL editor if your database predates the FIRE module.

CREATE TABLE IF NOT EXISTS fire_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  monthly_income numeric(12,2) DEFAULT 8000,
  annual_bonus numeric(12,2) DEFAULT 16000,
  current_age int DEFAULT 32,
  target_retire_age int DEFAULT 50,
  life_expectancy int DEFAULT 90,
  monthly_expenses numeric(12,2) DEFAULT 4000,
  current_invested numeric(14,2) DEFAULT 0,
  current_cash numeric(14,2) DEFAULT 0,
  cpf_oa numeric(14,2) DEFAULT 0,
  cpf_sa numeric(14,2) DEFAULT 0,
  cpf_ma numeric(14,2) DEFAULT 0,
  monthly_etf_contribution numeric(12,2) DEFAULT 0,
  rsu_annual_grant numeric(12,2) DEFAULT 0,
  rsu_vest_years int DEFAULT 4,
  rsu_unvested_value numeric(14,2) DEFAULT 0,
  expected_return_pct numeric(5,2) DEFAULT 7,
  inflation_pct numeric(5,2) DEFAULT 2.5,
  swr_pct numeric(5,2) DEFAULT 4,
  target_retirement_sum text DEFAULT 'FRS' CHECK (target_retirement_sum IN ('BRS','FRS','ERS')),
  cpf_life_plan text DEFAULT 'standard' CHECK (cpf_life_plan IN ('standard','basic','escalating')),
  include_cpf_life boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fire_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own fire profile" ON fire_profiles;
CREATE POLICY "Users can manage own fire profile" ON fire_profiles FOR ALL USING (true);
