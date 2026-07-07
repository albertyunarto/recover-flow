# Implementation Plan: Fitbit Data Import & Recovery Intelligence Module

**Source PRD:** PRD RecoverFlow — Fitbit Data Import & Recovery Intelligence Module v1.0 (2026-07-07)
**Branch:** `claude/recoverflow-fitbit-import-vog5qs`
**Status:** Planned — not yet implemented

> This module surfaces wearable data to support recovery decisions. It is not
> medical advice. Verdicts are training-load guidance only; red flags always
> route to "see a professional".

---

## 1. Codebase Audit — what the module plugs into

Current stack (verified in repo): Next.js 16 App Router + React 19, Tailwind 4,
Recharts 3, Supabase via `@supabase/ssr`, server actions in `lib/actions/*`,
schema in `supabase/schema.sql` with manual-run migrations in
`supabase/migrations/` (pattern set by `001_add_strength_protocol.sql`).
All timestamps/dates already normalize to `Asia/Singapore` via
`formatDateSG()` in `lib/utils.ts`.

Integration points that already exist:

| PRD dependency | What's actually in the repo | Impact on plan |
|---|---|---|
| "weigh_ins" table | `weight_entries` (UNIQUE `(user_id, date)`), written by `lib/actions/weight.ts`, charted by `components/charts/weight-chart.tsx` on `/progress` | Imported weights upsert into `weight_entries` (new `source` column) so the existing chart and weekly-review calc work unchanged; `daily_metrics.weight_kg` also stores it for correlation joins |
| "run plan sessions" table | No session table — the plan is static JSON (`lib/data/run-schedule.json`, weeks 5–16) and completed runs are rows in `run_sessions` | "Link to plan session" becomes: match an imported Fitbit run/walk to the current plan week and, on confirm, create a `run_sessions` row with `source='fitbit'` |
| Pain journal | `pain_entries` — AM/PM per day, per-region scores (neck/back/elbow/knee) | Correlation view joins `daily_metrics` ↔ `pain_entries` on date with 0/1/2-day lag; per-region as PRD specifies |
| Daily Dashboard protocol card | `app/(app)/dashboard/page.tsx` composes cards; `RunCard` shows "Week N — tap to see today's intervals" | New `ReadinessCard` at top of dashboard; verdict prop threads into `RunCard` and exercise suggestion text |
| Weekly review | `weekly_reviews` table + `components/progress/weekly-review-form.tsx` | V1.1 weekly recovery report extends this |
| Charts | Recharts already installed | Correlation/overlay charts reuse the existing chart kit |
| Tests | **None — no test runner installed** | Phase 2 adds `vitest` (dev-only) for parser/unit fixtures; PRD requires fixture tests before real imports |
| ZIP/worker | Not present | Add `fflate`; Web Worker via `new Worker(new URL(...))` (supported by Next 16/Turbopack) |

New RLS policies will use `auth.uid() = user_id` checks. (Existing tables use
`USING (true)` — out of scope to fix here, but new tables shouldn't repeat it.)

---

## 2. Module Layout (new files)

```
lib/fitbit/
  types.ts              # FileEntry, DailyMetricPartial, ImportedExercise, FitbitFolderParser contract
  dates.ts              # MM/DD/YY + ISO → ISO-8601 date in Asia/Singapore (worker-safe, no server deps)
  units.ts              # miles→km, lb→kg (+ sanity bounds: weight 30–200 kg)
  merge.ts              # merge parser outputs keyed by date
  registry.ts           # parser list; folder detection; dry-run report
  worker.ts             # Web Worker: fflate streaming unzip → route files to parsers → progress + result messages
  parsers/
    sleep.ts            # Global Export Data/sleep-*.json ("stages" + "classic", naps merged per dateOfSleep)
    sleep-score.ts      # Sleep Score/sleep_score.csv
    resting-heart-rate.ts
    hrv.ts              # Heart Rate Variability/ (rmssd)
    weight.ts           # lb→kg
    steps.ts
    distance.ts         # mi→km (feeds imported exercise reconciliation)
    azm.ts              # Active Zone Minutes monthly CSVs
    stress.ts
    spo2.ts
    temperature.ts
    exercise.ts         # exercise-*.json → imported_exercises rows
    heart-rate.ts       # Phase 5: streamed intraday → daily {min, avg, zones}; raw discarded
  __fixtures__/         # small real-format samples per folder (incl. malformed rows)

lib/readiness/
  baseline.ts           # 30-day rolling baselines, min 14 days
  score.ts              # weighted score + verdict + graceful reweighting

lib/correlation.ts      # Pearson/Spearman, lagged join, insight thresholds (n≥14, |r|≥0.3)

lib/actions/
  fitbit-import.ts      # server action: batch upsert daily_metrics / imported_exercises / weight_entries mirror (500-row chunks)
  readiness.ts          # get-or-compute readiness for a date; backfill after import
  insights.ts           # correlation queries for the insights page

app/(app)/settings/import/page.tsx    # Import wizard route (Settings → Import Fitbit Data)
app/(app)/insights/page.tsx           # Pain ↔ Recovery correlation view

components/import/
  import-dropzone.tsx   # drag-drop ZIP or folder; spawns worker
  import-progress.tsx   # per-folder checklist + progress
  import-summary.tsx    # "412 days imported: …" + what was/wasn't found
components/dashboard/readiness-card.tsx
components/charts/correlation-chart.tsx   # overlay + lag chart
components/import/exercise-reconcile-list.tsx  # 1-tap confirm imported runs

supabase/migrations/002_fitbit_module.sql
```

### Parser contract (frozen after Phase 1, per PRD)

```ts
interface FitbitFolderParser {
  folder: string;                 // e.g. "Sleep Score"
  filePattern: RegExp;            // matched against filenames within the folder
  parse(files: FileEntry[]): Promise<ParseResult>;
}
// ParseResult = { partials: DailyMetricPartial[]; exercises?: ImportedExerciseRow[];
//                 rowsParsed: number; rowsSkipped: number }
```

Rules baked into every parser (PRD §5 gotchas — do not rediscover):
units converted at parse (mi→km, lb→kg); all dates → ISO in `Asia/Singapore`;
glob by filename prefix (files are chunked ~monthly); malformed rows are
skipped and counted, never thrown; a missing folder is not an error; both
sleep `"stages"` and `"classic"` types handled; naps on the same `dateOfSleep`
merged into the day's totals (main sleep drives efficiency/score); intraday HR
is aggregated in the worker and raw samples are never uploaded.

---

## 3. Data Model — migration `002_fitbit_module.sql`

Follows the repo's manual-run migration pattern; `supabase/schema.sql` updated
in the same commit to stay canonical.

```sql
CREATE TABLE daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  sleep_minutes int,
  sleep_efficiency int,
  sleep_score int,
  deep_min int, light_min int, rem_min int, awake_min int,
  resting_hr int,
  hrv_rmssd numeric(6,2),
  hr_min int, hr_avg int,
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

CREATE TABLE readiness_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  score int NOT NULL CHECK (score BETWEEN 0 AND 100),
  verdict text NOT NULL CHECK (verdict IN ('green','amber','red')),
  components jsonb NOT NULL,        -- {sleep:{pts,max}, rhr:{...}, hrv:{...}, load:{...}}
  baseline_snapshot jsonb NOT NULL, -- 30d baselines used (auditability)
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE TABLE imported_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  source_log_id text NOT NULL,      -- Fitbit logId (dedup key)
  started_at timestamptz NOT NULL,
  activity_type text NOT NULL,
  duration_min int,
  distance_km numeric(6,2),
  avg_hr int,
  calories int,
  linked_run_session_id uuid REFERENCES run_sessions(id) ON DELETE SET NULL,
  confirmed boolean NOT NULL DEFAULT false,
  imported_at timestamptz DEFAULT now(),
  UNIQUE (user_id, source_log_id)
);

-- Existing-table additions
ALTER TABLE weight_entries ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE run_sessions  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- Indexes + RLS (auth.uid() = user_id for all three new tables)
CREATE INDEX idx_daily_metrics_user_date ON daily_metrics(user_id, date);
CREATE INDEX idx_readiness_user_date ON readiness_scores(user_id, date);
CREATE INDEX idx_imported_ex_user ON imported_exercises(user_id, started_at);
```

Upsert keys (frozen after Phase 1): `daily_metrics (user_id, date, source)`,
`imported_exercises (user_id, source_log_id)`, `weight_entries (user_id, date)`
— re-imports are trivially idempotent, no import-batch bookkeeping.

TypeScript entity types (`DailyMetrics`, `ReadinessScore`, `ImportedExercise`,
`ReadinessVerdict`) added to `types/index.ts` alongside existing entities;
`WeightEntry` and `RunSession` gain `source`.

---

## 4. Readiness Engine (spec)

Inputs from `daily_metrics`; baselines are 30-day rolling means requiring ≥14
data points (else component is treated as missing).

| Component | Weight | Signal |
|---|---|---|
| Sleep score | 40 | Fitbit sleep score for the night ending on `date` (fallback: derived from duration+efficiency when score file absent) |
| RHR delta | 25 | Today's RHR vs 30-day baseline (lower = better; +5 bpm ≈ 0 pts, −2 bpm ≈ full) |
| HRV delta | 25 | rmssd vs 30-day baseline (higher = better) |
| Prior-day load | 10 | Yesterday's AZM vs 7-day average (heavier than usual → fewer pts) |

**Graceful degradation:** missing components have their weight redistributed
proportionally across present components (e.g. no HRV → sleep 53.3 / RHR 33.3
/ load 13.3). Minimum to compute at all: sleep + RHR present (per PRD
acceptance). Verdict: **≥80 green / 55–79 amber / <55 red**, exact cut points
tunable in one constant. Amber/red only ever *reduce* load, never increase it.

Computation is lazy + persisted: `lib/actions/readiness.ts` returns the stored
score for a date or computes-and-stores it from `daily_metrics`; the import
action triggers a backfill recompute for all affected dates (baselines shift
when history changes). Dashboard shows verdict + component breakdown + the
"data is N days stale" nudge when the newest `daily_metrics` date is old.

Dashboard protocol adjustment (Phase 3): green → normal week text; amber →
"hold — repeat last week's session" (run card swaps to previous week's
`run-schedule.json` entry); red → "mobility-only day" (exercise suggestion
points at cervical/mobility protocol, run card suggests skip). Suggest-only
with 1-tap accept — it never silently rewrites plan state (PRD open question
resolved to "suggest").

---

## 5. Import Pipeline (spec)

1. **Dropzone** accepts a Takeout ZIP or an unzipped folder (`webkitdirectory`
   fallback). File handles are passed to the worker — nothing read on the main
   thread.
2. **Worker** streams the ZIP with `fflate` (`Unzip` streaming API — never the
   whole archive in memory), routes each entry to the parser whose
   `folder`+`filePattern` matches, and posts `{folder, filesDone, filesTotal}`
   progress. `Heart Rate/` is processed **last** and is skippable; its files
   are parsed one at a time, aggregated to daily min/avg/zone-minutes, and
   the raw samples dropped immediately.
3. **Dry-run mode** (Phase 1 deliverable): same pipeline with writes disabled —
   emits the detected-folder checklist, per-metric day counts, unknown-folder
   list, and skipped-row counts.
4. **Persistence**: worker result (merged `DailyMetricPartial[]` + exercises)
   is sent to `lib/actions/fitbit-import.ts`, which upserts in 500-row chunks
   (payload is ~1 row/day — tiny). Weight values also mirror into
   `weight_entries` with `source='fitbit_export'` (manual entries for the same
   date are not overwritten — imported weight only fills empty dates or
   updates rows whose source is already `fitbit_export`).
5. **Summary** screen reports days imported per metric and what wasn't found;
   readiness backfill runs, then `revalidatePath('/dashboard')` etc.

Exercise reconciliation (Phase 4): imported Walk/Run/Treadmill activities that
fall in plan weeks (5–16) and are within ±30% of the planned session duration
appear in a "Found on your Fitbit" list; 1-tap confirm creates a
`run_sessions` row (`source='fitbit'`, duration from the import) and links it
via `linked_run_session_id`. Unmatched activities can still be confirmed as
unplanned sessions or dismissed.

---

## 6. Build Phases

### Phase 1 — Schema + Import Skeleton (1–2 sessions)
- [ ] Migration 002 + `schema.sql` update + `types/index.ts` entities
- [ ] Add `fflate`; add `vitest` (+ `test` script) — needed from Phase 1 for date/unit utils
- [ ] `lib/fitbit/`: types, dates, units, merge, registry; worker with unzip + folder detection
- [ ] `app/(app)/settings/import` page: dropzone → detected-folder checklist → dry-run report (counts only, no writes); link from Settings page
- **Deliverable:** drop a ZIP, see detected folders + dry-run summary
- **Frozen afterward:** `daily_metrics` schema, parser contract, upsert keys

### Phase 2 — Core Parsers + Persistence (2–3 sessions)
- [ ] Parsers: sleep, sleep-score, resting-heart-rate, hrv, weight, steps, distance, azm, stress, spo2, temperature
- [ ] Fixture-based unit tests (miles/pounds/MM-DD-YY/`stages`-vs-`classic`/malformed rows) — **before any real import** (PRD risk: units bug corrupts history)
- [ ] `fitbit-import.ts` batch-upsert action; import summary UI; idempotency check (re-import same ZIP → 0 new rows)
- [ ] Weight mirror into `weight_entries`; `/progress` chart shows imported points; weight logging UI hides for dates covered by import
- **Deliverable:** full backfill of `daily_metrics`; weight chart populated from export

### Phase 3 — Readiness Engine (1–2 sessions)
- [ ] `lib/readiness/` baseline + score with reweighting; unit tests incl. missing-HRV and <14-day cases
- [ ] `readiness.ts` action (lazy compute + post-import backfill)
- [ ] `ReadinessCard` on dashboard: score, verdict color, component bars, staleness nudge, disclaimer line
- [ ] Verdict-adjusted protocol text in `RunCard` + exercise suggestion (suggest + 1-tap accept)
- **Deliverable:** morning verdict on dashboard modifying the day's card

### Phase 4 — Exercise Auto-fill + Correlations (2 sessions)
- [ ] `exercise.ts` parser → `imported_exercises`; reconcile list + confirm flow → `run_sessions`
- [ ] `lib/correlation.ts` (Pearson + Spearman, 0/1/2-day lag join of `daily_metrics` × `pain_entries` by region)
- [ ] `/insights` page: overlay chart (pain vs sleep/RHR/load/stress) + insight cards — render only when n≥14 and |r|≥0.3, always showing n and effect size, phrased as observations
- [ ] PNG (chart-to-canvas) + CSV export for physio visits
- **Deliverable:** Fitbit runs reconcile with plan; insight cards live

### Phase 5 — Polish (1 session)
- [ ] `heart-rate.ts` streamed intraday aggregation (optional, processed last)
- [ ] Illness red-flag banner: skin temp deviation >+1.0 °C AND RHR >+8 bpm vs baseline → "possible illness — rest + monitor, see a professional if it persists"
- [ ] Empty/error/partial-import states; 375 px pass on import, dashboard, insights; deploy

**Explicit non-goals (PRD):** no raw intraday storage, no Fitbit OAuth/API sync,
no food-log import, no medical claims, no real-time sync.

---

## 7. Verification & Acceptance

| Check | How |
|---|---|
| 1 GB archive imports without tab crash | Manual run with real Takeout export; streamed unzip keeps memory flat |
| Re-import creates 0 duplicates | Import same ZIP twice → row counts unchanged (automated against a fixture archive) |
| Partial archive imports cleanly | Fixture ZIP with folders removed → summary lists missing folders, no errors |
| Unit conversions | Vitest fixtures: known lb/mi inputs → kg ±0.1 / km ±0.01 |
| Readiness degradation | Unit tests: HRV missing → reweighted score; <sleep+RHR → no score |
| Verdict changes dashboard | Seed amber/red day → protocol card text changes |
| Insight thresholds | Unit tests: n=13 or |r|=0.29 → no card |
| Import speed <90 s (1-yr archive) | `performance.now()` timing logged in import summary |

---

## 8. Risks & Open Questions (resolved against the repo)

- **Google changes export structure** → parser-per-folder isolation; dry-run
  surfaces unknown folders; parsers skip, never crash.
- **Memory blow-up** → streaming unzip, file-at-a-time parse, HR last/optional.
- **Bad advice** → amber/red only reduce load; disclaimer on the card; illness
  flag says "see a professional".
- **Weight conflict** (manual vs imported on same date) → manual wins; decided
  above in §5.
- **Amber auto-modify vs suggest** → suggest + 1-tap accept (decided, §4).
- **Keep raw ZIP in Supabase Storage?** → no; local-only, privacy-first
  (PRD default confirmed — nothing raw ever leaves the browser).
- **Does the device export nightly HRV?** → answered by the first dry-run
  report; the formula degrades gracefully either way.
- **Native 31-day CSV export as lighter weekly path** → test during Phase 2
  with a real export; if the format matches Global Export Data files, the same
  parsers cover it for free.
