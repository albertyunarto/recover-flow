"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Flame,
  PiggyBank,
  TrendingUp,
  Landmark,
  Target,
  Check,
  AlertTriangle,
  Save,
  Wallet,
  CalendarClock,
} from "lucide-react";
import type {
  CpfLifePlan,
  FireInputs,
  RetirementSumTier,
} from "@/types";
import { buildSummary } from "@/lib/fire/projection";
import { cpfEmployeeRate } from "@/lib/fire/cpf";
import { saveFireProfile } from "@/lib/actions/fire";
import { cn, formatSGD, formatSGDShort } from "@/lib/utils";
import {
  OW_CEILING_MONTHLY,
  RETIREMENT_SUMS,
  RETIREMENT_SUM_LABELS,
} from "@/lib/data/fire/sg-cpf";
import { ProjectionChart } from "./projection-chart";

const SUM_TIERS: RetirementSumTier[] = ["BRS", "FRS", "ERS"];
const PLANS: { value: CpfLifePlan; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "basic", label: "Basic" },
  { value: "escalating", label: "Escalating" },
];

export function FirePlanner({ initial }: { initial: FireInputs }) {
  const [inputs, setInputs] = useState<FireInputs>(initial);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const summary = useMemo(() => buildSummary(inputs), [inputs]);

  function set<K extends keyof FireInputs>(key: K, value: FireInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await saveFireProfile(inputs);
      setMessage(result.error ?? "Plan saved!");
      setTimeout(() => setMessage(null), 3500);
    });
  }

  const employeeCpf =
    Math.min(inputs.monthly_income, OW_CEILING_MONTHLY) *
    cpfEmployeeRate(inputs.current_age);
  const yearsToRetire = Math.max(0, inputs.target_retire_age - inputs.current_age);
  const reachable = Number.isFinite(summary.requiredMonthlySavings);
  const savingEnough = summary.onTrack;

  return (
    <div className="space-y-4">
      {message && (
        <div className="sticky top-16 z-10 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      )}

      {/* ---- Headline verdict ---- */}
      <div
        className={cn(
          "rounded-xl border p-4 shadow-sm space-y-3",
          savingEnough
            ? "bg-success/10 border-success/30"
            : reachable
              ? "bg-warning/10 border-warning/30"
              : "bg-destructive/10 border-destructive/30"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "rounded-full p-2",
              savingEnough
                ? "bg-success/20 text-success"
                : reachable
                  ? "bg-warning/20 text-warning"
                  : "bg-destructive/20 text-destructive"
            )}
          >
            {savingEnough ? (
              <Check className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1">
            {savingEnough ? (
              <>
                <p className="text-sm font-semibold">
                  On track to retire at {inputs.target_retire_age}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your {formatSGD(inputs.monthly_etf_contribution)}/mo funds
                  spending to age {inputs.life_expectancy}
                  {summary.earliestFireAge &&
                  summary.earliestFireAge < inputs.target_retire_age
                    ? ` — you could even retire at ${summary.earliestFireAge}.`
                    : "."}
                </p>
              </>
            ) : reachable ? (
              <>
                <p className="text-sm font-semibold">
                  Save {formatSGD(summary.requiredMonthlySavings)}/mo to retire at{" "}
                  {inputs.target_retire_age}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  That&apos;s {formatSGD(Math.max(0, summary.savingsGap))}/mo more
                  than you invest now. At today&apos;s rate the plan lasts to age{" "}
                  {summary.fundedToAge}.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">
                  Retiring at {inputs.target_retire_age} isn&apos;t reachable yet
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Even very high savings fall short. Try a later age, lower
                  retirement spending, or a higher return assumption.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ---- Key metrics ---- */}
      <div className="grid grid-cols-2 gap-3">
        <Metric
          icon={PiggyBank}
          tone="primary"
          label="Required savings"
          value={
            reachable ? `${formatSGD(summary.requiredMonthlySavings)}` : "—"
          }
          sub={`vs ${formatSGD(summary.currentMonthlySavings)}/mo now`}
        />
        <Metric
          icon={Flame}
          tone="streak"
          label="Earliest FIRE age"
          value={summary.earliestFireAge ? `${summary.earliestFireAge}` : "—"}
          sub={
            summary.earliestFireAge
              ? `at ${formatSGD(inputs.monthly_etf_contribution)}/mo`
              : "increase savings"
          }
        />
        <Metric
          icon={Target}
          tone="success"
          label="Portfolio at retirement"
          value={formatSGDShort(summary.projectedPortfolioAtRetire)}
          sub={`need ${formatSGDShort(summary.requiredPortfolioAtRetire)}`}
        />
        <Metric
          icon={TrendingUp}
          tone="warning"
          label="FIRE number (4% rule)"
          value={formatSGDShort(summary.fireNumber)}
          sub={`${formatSGD(inputs.monthly_expenses)}/mo spend`}
        />
      </div>

      {/* ---- Projection chart ---- */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Net worth projection</h2>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" /> Invest+cash
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-streak" /> CPF
            </span>
          </div>
        </div>
        <ProjectionChart
          series={summary.series}
          retireAge={inputs.target_retire_age}
        />
        <p className="text-[11px] text-muted-foreground">
          Net worth peaks around retirement, then your investments are drawn down
          to cover spending until CPF LIFE income kicks in at 65.
        </p>
      </div>

      {/* ---- CPF LIFE ---- */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-streak" />
          <h2 className="text-sm font-semibold">CPF LIFE</h2>
          <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={inputs.include_cpf_life}
              onChange={(e) => set("include_cpf_life", e.target.checked)}
              className="h-3.5 w-3.5 accent-[hsl(262,83%,58%)]"
            />
            Include in plan
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-streak/10 p-3">
            <p className="text-[11px] text-muted-foreground">
              Monthly payout from 65
            </p>
            <p className="text-2xl font-bold text-streak">
              {formatSGD(summary.cpfLifeMonthly)}
            </p>
            <p className="text-[11px] text-muted-foreground">for life</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-[11px] text-muted-foreground">
              Retirement Account at 55
            </p>
            <p className="text-2xl font-bold">{formatSGDShort(summary.raAt55)}</p>
            <p className="text-[11px] text-muted-foreground">
              target {RETIREMENT_SUM_LABELS[inputs.target_retirement_sum]}
            </p>
          </div>
        </div>

        {/* Retirement sum tier */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Retirement sum to set aside at 55
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SUM_TIERS.map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => set("target_retirement_sum", tier)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-center transition-colors active:scale-95",
                  inputs.target_retirement_sum === tier
                    ? "border-streak bg-streak/10 text-streak"
                    : "border-input hover:bg-muted"
                )}
              >
                <span className="block text-xs font-semibold">{tier}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {formatSGDShort(RETIREMENT_SUMS[tier])}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* CPF LIFE plan */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">CPF LIFE plan</label>
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => set("cpf_life_plan", p.value)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-xs font-medium transition-colors active:scale-95",
                  inputs.cpf_life_plan === p.value
                    ? "border-streak bg-streak/10 text-streak"
                    : "border-input hover:bg-muted"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          CPF LIFE is Singapore&apos;s national annuity — your Retirement Account
          is converted into a lifelong monthly payout from age 65. Estimates use
          2026 figures.
        </p>
      </div>

      {/* ---- Inputs ---- */}
      <Section title="Income & timeline" icon={Wallet}>
        <Slider
          label="Target retirement age"
          value={inputs.target_retire_age}
          min={inputs.current_age + 1}
          max={75}
          step={1}
          onChange={(v) => set("target_retire_age", v)}
          display={`${inputs.target_retire_age} · ${yearsToRetire}y to go`}
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Current age"
            value={inputs.current_age}
            onChange={(v) => set("current_age", v)}
          />
          <NumberField
            label="Life expectancy"
            value={inputs.life_expectancy}
            onChange={(v) => set("life_expectancy", v)}
          />
          <NumberField
            label="Gross monthly income"
            value={inputs.monthly_income}
            onChange={(v) => set("monthly_income", v)}
            prefix="$"
            step={500}
          />
          <NumberField
            label="Annual bonus"
            value={inputs.annual_bonus}
            onChange={(v) => set("annual_bonus", v)}
            prefix="$"
            step={1000}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          ≈ {formatSGD(employeeCpf)}/mo of your salary goes to CPF (employee
          share). Capped at the {formatSGD(OW_CEILING_MONTHLY)} wage ceiling.
        </p>
      </Section>

      <Section title="Spending in retirement" icon={CalendarClock}>
        <Slider
          label="Monthly retirement spend (today's $)"
          value={inputs.monthly_expenses}
          min={1000}
          max={15000}
          step={100}
          onChange={(v) => set("monthly_expenses", v)}
          display={formatSGD(inputs.monthly_expenses)}
        />
      </Section>

      <Section title="Savings & investments" icon={PiggyBank}>
        <Slider
          label="Monthly into ETFs / investments"
          value={inputs.monthly_etf_contribution}
          min={0}
          max={15000}
          step={100}
          onChange={(v) => set("monthly_etf_contribution", v)}
          display={formatSGD(inputs.monthly_etf_contribution)}
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Invested (ETFs/stocks)"
            value={inputs.current_invested}
            onChange={(v) => set("current_invested", v)}
            prefix="$"
            step={1000}
          />
          <NumberField
            label="Cash / war-chest"
            value={inputs.current_cash}
            onChange={(v) => set("current_cash", v)}
            prefix="$"
            step={1000}
          />
        </div>
      </Section>

      <Section title="RSUs / equity comp" icon={TrendingUp}>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="New grant / year"
            value={inputs.rsu_annual_grant}
            onChange={(v) => set("rsu_annual_grant", v)}
            prefix="$"
            step={1000}
          />
          <NumberField
            label="Vesting period (yrs)"
            value={inputs.rsu_vest_years}
            onChange={(v) => set("rsu_vest_years", v)}
            step={1}
          />
          <NumberField
            label="Unvested value now"
            value={inputs.rsu_unvested_value}
            onChange={(v) => set("rsu_unvested_value", v)}
            prefix="$"
            step={1000}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Vested RSUs are assumed sold and reinvested. In SG they&apos;re taxed as
          income on vesting, so enter after-tax values you&apos;ll actually invest.
        </p>
      </Section>

      <Section title="CPF balances" icon={Landmark}>
        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label="OA"
            value={inputs.cpf_oa}
            onChange={(v) => set("cpf_oa", v)}
            prefix="$"
            step={1000}
          />
          <NumberField
            label="SA"
            value={inputs.cpf_sa}
            onChange={(v) => set("cpf_sa", v)}
            prefix="$"
            step={1000}
          />
          <NumberField
            label="MediSave"
            value={inputs.cpf_ma}
            onChange={(v) => set("cpf_ma", v)}
            prefix="$"
            step={1000}
          />
        </div>
      </Section>

      <Section title="Assumptions" icon={Target}>
        <Slider
          label="Expected investment return"
          value={inputs.expected_return_pct}
          min={2}
          max={12}
          step={0.5}
          onChange={(v) => set("expected_return_pct", v)}
          display={`${inputs.expected_return_pct}% / yr`}
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Inflation %"
            value={inputs.inflation_pct}
            onChange={(v) => set("inflation_pct", v)}
            suffix="%"
            step={0.5}
          />
          <NumberField
            label="Withdrawal rate %"
            value={inputs.swr_pct}
            onChange={(v) => set("swr_pct", v)}
            suffix="%"
            step={0.25}
          />
        </div>
      </Section>

      {/* ---- Save ---- */}
      <div className="sticky bottom-20 md:bottom-4 z-10">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg active:scale-[0.99] disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Saving…" : "Save plan"}
        </button>
      </div>

      <p className="pb-2 text-center text-[11px] text-muted-foreground">
        Estimates for personal planning only — not financial advice. CPF figures
        reflect 2026 rates and may change.
      </p>
    </div>
  );
}

// ---------- small building blocks ----------

const TONES = {
  primary: "bg-primary/10 text-primary",
  streak: "bg-streak/10 text-streak",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
} as const;

function Metric({
  icon: Icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONES;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={cn("rounded-md p-1", TONES[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
          className={cn(
            "h-9 w-full rounded-md border border-input bg-background px-3 text-sm",
            prefix && "pl-6",
            suffix && "pr-7"
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="text-sm font-semibold text-primary">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[hsl(221,83%,53%)]"
      />
    </div>
  );
}
