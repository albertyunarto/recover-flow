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
  source: string;
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
  source: string;
  created_at: string;
}

export interface DailyMetrics {
  id: string;
  user_id: string;
  date: string;
  sleep_minutes: number | null;
  sleep_efficiency: number | null;
  sleep_score: number | null;
  deep_min: number | null;
  light_min: number | null;
  rem_min: number | null;
  awake_min: number | null;
  resting_hr: number | null;
  hrv_rmssd: number | null;
  hr_min: number | null;
  hr_avg: number | null;
  azm_total: number | null;
  steps: number | null;
  stress_score: number | null;
  spo2_avg: number | null;
  skin_temp_deviation: number | null;
  weight_kg: number | null;
  source: string;
  imported_at: string;
}

export type ReadinessVerdict = "green" | "amber" | "red";

export interface ReadinessComponent {
  pts: number;
  max: number;
}

export interface ReadinessScore {
  id: string;
  user_id: string;
  date: string;
  score: number;
  verdict: ReadinessVerdict;
  components: Record<string, ReadinessComponent>;
  baseline_snapshot: Record<string, number | null>;
  created_at: string;
}

export interface ImportedExercise {
  id: string;
  user_id: string;
  source_log_id: string;
  started_at: string;
  activity_type: string;
  duration_min: number | null;
  distance_km: number | null;
  avg_hr: number | null;
  calories: number | null;
  linked_run_session_id: string | null;
  confirmed: boolean;
  dismissed: boolean;
  imported_at: string;
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
  | "strength"
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
