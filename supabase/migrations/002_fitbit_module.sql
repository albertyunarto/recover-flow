-- Migration 002: Fitbit Data Import & Recovery Intelligence Module
--
-- Adds the tables backing the Fitbit Takeout import: one daily-aggregate row
-- per user/day (daily_metrics), computed readiness scores, and imported
-- exercise sessions pending reconciliation with the run plan. Also tags
-- weight_entries and run_sessions rows with their source so imported data
-- can coexist with manual entries.
--
-- Run this once in the Supabase SQL editor (Database -> SQL editor -> New query).
-- Safe to run on an existing database with data.

-- One row per user per day, merged from all Fitbit export folders.
-- Raw intraday data (e.g. 5-second heart rate) is never stored — aggregates only.
CREATE TABLE daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  sleep_minutes int,
  sleep_efficiency int,
  sleep_score int,
  deep_min int,
  light_min int,
  rem_min int,
  awake_min int,
  resting_hr int,
  hrv_rmssd numeric(6,2),
  hr_min int,
  hr_avg int,
  azm_total int,
  steps int,
  stress_score int,
  spo2_avg numeric(4,1),
  skin_temp_deviation numeric(3,1),
  weight_kg numeric(4,1) CHECK (weight_kg IS NULL OR weight_kg BETWEEN 30 AND 200),
  source text NOT NULL DEFAULT 'fitbit_export',
  imported_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date, source)
);

-- Daily readiness score with full audit trail: the component point breakdown
-- and the 30-day baselines it was computed against.
CREATE TABLE readiness_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  score int NOT NULL CHECK (score BETWEEN 0 AND 100),
  verdict text NOT NULL CHECK (verdict IN ('green','amber','red')),
  components jsonb NOT NULL,
  baseline_snapshot jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

-- Exercise sessions from the Fitbit export, pending 1-tap confirmation into
-- run_sessions. source_log_id is Fitbit's logId — the dedup key across re-imports.
CREATE TABLE imported_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  source_log_id text NOT NULL,
  started_at timestamptz NOT NULL,
  activity_type text NOT NULL,
  duration_min int,
  distance_km numeric(6,2),
  avg_hr int,
  calories int,
  linked_run_session_id uuid REFERENCES run_sessions(id) ON DELETE SET NULL,
  confirmed boolean NOT NULL DEFAULT false,
  dismissed boolean NOT NULL DEFAULT false,
  imported_at timestamptz DEFAULT now(),
  UNIQUE (user_id, source_log_id)
);

-- Tag existing tables so imported rows are distinguishable from manual ones.
ALTER TABLE weight_entries ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE run_sessions ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- Indexes
CREATE INDEX idx_daily_metrics_user_date ON daily_metrics(user_id, date);
CREATE INDEX idx_readiness_user_date ON readiness_scores(user_id, date);
CREATE INDEX idx_imported_ex_user ON imported_exercises(user_id, started_at);

-- Row Level Security
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own daily metrics" ON daily_metrics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own readiness scores" ON readiness_scores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own imported exercises" ON imported_exercises
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
