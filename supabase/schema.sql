-- RecoverFlow Database Schema
-- Run this in the Supabase SQL editor to set up the database

-- User profile and current state
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT 'Albert',
  height_cm int DEFAULT 175,
  start_weight_kg decimal(4,1) DEFAULT 88.0,
  target_weight_kg decimal(4,1) DEFAULT 77.0,
  daily_calorie_target int DEFAULT 1850,
  daily_protein_target int DEFAULT 140,
  daily_water_target_ml int DEFAULT 3000,
  current_phase int DEFAULT 1 CHECK (current_phase BETWEEN 1 AND 4),
  current_week int DEFAULT 1 CHECK (current_week BETWEEN 1 AND 24),
  plan_start_date date,
  created_at timestamptz DEFAULT now()
);

-- Pain entries (AM/PM per day)
CREATE TABLE pain_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  time_of_day text NOT NULL CHECK (time_of_day IN ('AM', 'PM')),
  neck_score int CHECK (neck_score BETWEEN 0 AND 10),
  back_score int CHECK (back_score BETWEEN 0 AND 10),
  elbow_score int CHECK (elbow_score BETWEEN 0 AND 10),
  knee_score int CHECK (knee_score BETWEEN 0 AND 10),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date, time_of_day)
);

-- Exercise session logs
CREATE TABLE exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  protocol text NOT NULL CHECK (protocol IN ('cervical','elbow','strength','core','lower_body','foot')),
  exercises jsonb NOT NULL,
  total_exercises int NOT NULL,
  completed_count int NOT NULL,
  duration_minutes int,
  phase int NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Run sessions
CREATE TABLE run_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  week_number int NOT NULL,
  phase int NOT NULL,
  planned_format text NOT NULL,
  total_duration_sec int,
  total_run_sec int,
  total_walk_sec int,
  cycles_completed int,
  perceived_effort int CHECK (perceived_effort BETWEEN 1 AND 10),
  notes text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

-- Nutrition entries
CREATE TABLE nutrition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  food_name text NOT NULL,
  calories int NOT NULL,
  protein_g int DEFAULT 0,
  carbs_g int DEFAULT 0,
  fat_g int DEFAULT 0,
  source text DEFAULT 'custom' CHECK (source IN ('template','database','custom','recent','ai')),
  source_id text,
  ai_reasoning text,
  created_at timestamptz DEFAULT now()
);

-- User's custom foods
CREATE TABLE custom_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  calories int NOT NULL,
  protein_g int DEFAULT 0,
  carbs_g int DEFAULT 0,
  fat_g int DEFAULT 0,
  category text,
  created_at timestamptz DEFAULT now()
);

-- Weight entries
CREATE TABLE weight_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  weight_kg decimal(4,1) NOT NULL,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Hydration daily log
CREATE TABLE hydration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  glasses int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Weekly reviews
CREATE TABLE weekly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_number int NOT NULL,
  phase int NOT NULL,
  avg_pain jsonb,
  exercise_adherence_pct decimal(4,1),
  total_run_minutes int,
  avg_daily_calories int,
  avg_daily_protein int,
  weight_kg decimal(4,1),
  weight_change_kg decimal(3,1),
  notes text,
  gate_criteria jsonb,
  week_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_number)
);

-- Fitbit module: one row per user per day, merged from all export folders.
-- Aggregates only — raw intraday data is never stored.
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

-- Daily readiness score with component breakdown and baseline audit trail
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

-- Fitbit exercise sessions pending 1-tap confirmation into run_sessions
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

-- Indexes
CREATE INDEX idx_pain_user_date ON pain_entries(user_id, date);
CREATE INDEX idx_exercise_user_date ON exercise_logs(user_id, date);
CREATE INDEX idx_nutrition_user_date ON nutrition_entries(user_id, date);
CREATE INDEX idx_weight_user_date ON weight_entries(user_id, date);
CREATE INDEX idx_run_user_date ON run_sessions(user_id, date);
CREATE INDEX idx_hydration_user_date ON hydration_logs(user_id, date);
CREATE INDEX idx_daily_metrics_user_date ON daily_metrics(user_id, date);
CREATE INDEX idx_readiness_user_date ON readiness_scores(user_id, date);
CREATE INDEX idx_imported_ex_user ON imported_exercises(user_id, started_at);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies (all tables: user can only access their own data)
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (true);

CREATE POLICY "Users can manage own pain entries" ON pain_entries FOR ALL USING (true);
CREATE POLICY "Users can manage own exercise logs" ON exercise_logs FOR ALL USING (true);
CREATE POLICY "Users can manage own run sessions" ON run_sessions FOR ALL USING (true);
CREATE POLICY "Users can manage own nutrition entries" ON nutrition_entries FOR ALL USING (true);
CREATE POLICY "Users can manage own custom foods" ON custom_foods FOR ALL USING (true);
CREATE POLICY "Users can manage own weight entries" ON weight_entries FOR ALL USING (true);
CREATE POLICY "Users can manage own hydration logs" ON hydration_logs FOR ALL USING (true);
CREATE POLICY "Users can manage own weekly reviews" ON weekly_reviews FOR ALL USING (true);

CREATE POLICY "Users can manage own daily metrics" ON daily_metrics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own readiness scores" ON readiness_scores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own imported exercises" ON imported_exercises
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
