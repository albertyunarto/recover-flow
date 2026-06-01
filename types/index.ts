// ========================================
// Database entity types (match Supabase schema)
// ========================================

export interface User {
  id: string;
  email: string;
  name: string;
  height_cm: number | null;
  start_weight_kg: number | null;
  target_weight_kg: number | null;
  daily_calorie_target: number;
  daily_protein_target: number;
  daily_water_target_ml: number;
  current_phase: number;
  current_week: number;
  plan_start_date: string | null;
  created_at: string;
}

export interface PainEntry {
  id: string;
  user_id: string;
  date: string;
  time_of_day: "AM" | "PM";
  neck_score: number | null;
  back_score: number | null;
  elbow_score: number | null;
  knee_score: number | null;
  notes: string | null;
  created_at: string;
}

export interface ExerciseLog {
  id: string;
  user_id: string;
  date: string;
  protocol: ProtocolType;
  exercises: ExerciseCompletion[];
  total_exercises: number;
  completed_count: number;
  duration_minutes: number | null;
  phase: number;
  created_at: string;
}

export interface ExerciseCompletion {
  id: string;
  name: string;
  sets_completed: number;
  total_sets: number;
  skipped: boolean;
  notes?: string;
}

export interface RunSession {
  id: string;
  user_id: string;
  date: string;
  week_number: number;
  phase: number;
  planned_format: string;
  total_duration_sec: number | null;
  total_run_sec: number | null;
  total_walk_sec: number | null;
  cycles_completed: number | null;
  perceived_effort: number | null;
  notes: string | null;
  created_at: string;
}

export interface NutritionEntry {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: "template" | "database" | "custom" | "recent" | "ai";
  source_id: string | null;
  ai_reasoning: string | null;
  created_at: string;
}

export interface CustomFood {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  category: string | null;
  created_at: string;
}

export interface AIParsedFoodItem {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_size: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

export interface WeightEntry {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
}

export interface HydrationLog {
  id: string;
  user_id: string;
  date: string;
  glasses: number;
  created_at: string;
}

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_number: number;
  phase: number;
  avg_pain: { neck: number; back: number; elbow: number; knee: number } | null;
  exercise_adherence_pct: number | null;
  total_run_minutes: number | null;
  avg_daily_calories: number | null;
  avg_daily_protein: number | null;
  weight_kg: number | null;
  weight_change_kg: number | null;
  notes: string | null;
  gate_criteria: GateCriterion[] | null;
  week_completed: boolean;
  created_at: string;
}

// ========================================
// Static data types
// ========================================

export type ProtocolType =
  | "cervical"
  | "elbow"
  | "core"
  | "lower_body"
  | "foot";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type PainRegion = "neck" | "back" | "elbow" | "knee";

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  hold_sec: number;
  form_cue: string;
  why: string;
  video_url?: string;
}

export interface ExerciseProtocol {
  protocol: ProtocolType;
  phase: number;
  frequency: string;
  duration_minutes: number;
  exercises: Exercise[];
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_size: string;
  tags: string[];
}

export interface RunWeekSchedule {
  week: number;
  phase: number;
  walk_min?: number;
  run_min?: number;
  cycles?: number;
  total_min?: number;
  format?: string;
  total_run_min?: number;
  sessions_per_week?: number;
}

export interface Phase {
  number: number;
  name: string;
  weeks: [number, number];
  description: string;
  color: string;
}

export interface GateCriterion {
  id: string;
  label: string;
  type: "auto" | "manual";
  met: boolean;
}

export interface PhaseTransition {
  from: number;
  to: number;
  name: string;
  criteria: Omit<GateCriterion, "met">[];
}

export interface MealPlanDay {
  meals: {
    type: MealType;
    food_id: string;
    food_name: string;
    calories: number;
    protein_g: number;
  }[];
  total_calories: number;
  total_protein_g: number;
}

// ========================================
// Dashboard aggregation types
// ========================================

export interface DashboardData {
  user: User;
  todayPain: PainEntry[];
  todayExercises: ExerciseLog[];
  todayNutrition: NutritionEntry[];
  todayHydration: HydrationLog | null;
  streak: number;
  phase: Phase;
}

export interface NutritionTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface WeeklyStats {
  avg_pain: { neck: number; back: number; elbow: number; knee: number };
  pain_trends: {
    neck: "up" | "down" | "stable";
    back: "up" | "down" | "stable";
    elbow: "up" | "down" | "stable";
    knee: "up" | "down" | "stable";
  };
  exercise_adherence_pct: number;
  avg_daily_calories: number;
  avg_daily_protein: number;
  total_run_minutes: number;
  weight_kg: number | null;
  weight_change_kg: number | null;
}

// ========================================
// FIRE planner types (Singapore-focused)
// ========================================

export type RetirementSumTier = "BRS" | "FRS" | "ERS";
export type CpfLifePlan = "standard" | "basic" | "escalating";

// The full set of inputs that drive a projection. Stored per-user in Supabase
// and mirrored as reactive state in the planner UI.
export interface FireInputs {
  // Income (gross, before CPF)
  monthly_income: number; // gross monthly salary
  annual_bonus: number; // additional wages (bonus) paid per year

  // Timeline
  current_age: number;
  target_retire_age: number;
  life_expectancy: number;

  // Spending (expressed in today's dollars)
  monthly_expenses: number; // expected monthly spend in retirement

  // Current assets
  current_invested: number; // ETF / equities portfolio
  current_cash: number; // cash / war-chest (spendable, no growth)
  cpf_oa: number; // CPF Ordinary Account balance
  cpf_sa: number; // CPF Special Account balance
  cpf_ma: number; // CPF MediSave balance

  // Plan
  monthly_etf_contribution: number; // recurring amount invested each month

  // RSU / equity compensation
  rsu_annual_grant: number; // value of new RSUs granted each year
  rsu_vest_years: number; // vesting period for each grant
  rsu_unvested_value: number; // value of RSUs already granted but not yet vested

  // Assumptions
  expected_return_pct: number; // nominal annual return on invested assets
  inflation_pct: number; // annual inflation
  swr_pct: number; // safe withdrawal rate (for the simple FIRE number)

  // CPF retirement choices
  target_retirement_sum: RetirementSumTier; // sum set aside in RA at 55
  cpf_life_plan: CpfLifePlan;
  include_cpf_life: boolean; // factor CPF LIFE payouts into the plan
}

export interface FireProfile extends FireInputs {
  id: string;
  user_id: string;
  updated_at: string;
}

// One row of the year-by-year projection.
export interface ProjectionYear {
  age: number;
  year: number;
  invested: number; // ETF / equities + reinvested cash & RSUs
  cpf: number; // OA + SA + MA + RA combined
  cpfLiquid: number; // CPF accessible for spending (OA from age 55)
  ma: number; // MediSave (locked for healthcare)
  netWorth: number; // invested + cash + all CPF
  spendable: number; // invested + cash + accessible CPF
  annualExpense: number; // inflated retirement spend (0 while working)
  cpfLifePayout: number; // annual CPF LIFE income (0 before payout age)
  contribution: number; // amount added to invested that year
  phase: "accumulate" | "bridge" | "cpf_life";
}

export interface FireSummary {
  // Headline numbers
  fireNumber: number; // simple SWR-based target (today's dollars)
  requiredPortfolioAtRetire: number; // invested needed at retirement (future $)
  projectedPortfolioAtRetire: number; // invested projected at retirement (future $)
  projectedNetWorthAtRetire: number;
  requiredMonthlySavings: number; // monthly investing needed to retire on time
  currentMonthlySavings: number;
  savingsGap: number; // required - current (negative = surplus)

  // Outcomes
  earliestFireAge: number | null; // earliest age fully funded at current savings
  onTrack: boolean;
  fundedToAge: number; // age the plan lasts to under current savings
  finalBalance: number; // spendable left at life expectancy (current plan)

  // CPF LIFE
  cpfLifeMonthly: number; // estimated monthly payout from payout age
  raAt55: number; // projected Retirement Account at 55

  series: ProjectionYear[]; // projection under current savings
}
