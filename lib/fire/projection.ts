// FIRE projection engine. A single year-by-year simulation ties together ETF
// growth, CPF contributions/interest, RSU vesting and CPF LIFE payouts. Binary
// searches on top of it answer the planner's headline questions: how much to
// save each month, the earliest age you could retire, and the portfolio needed
// at retirement. All pure — runs client-side for instant recalculation.

import type { FireInputs, FireSummary, ProjectionYear } from "@/types";
import {
  CPF_LIFE_PLAN_FACTORS,
  CPF_PAYOUT_AGE,
  RA_FORMATION_AGE,
  RETIREMENT_SUMS,
} from "@/lib/data/fire/sg-cpf";
import {
  accrueInterest,
  annualCpfContribution,
  estimateCpfLifePayout,
  formRetirementAccount,
  type CpfBalances,
} from "./cpf";

const n = (v: number) => (Number.isFinite(v) ? v : 0);

// Value of RSUs vesting in a given working year (0-based). Existing unvested
// stock vests evenly over the remaining vest period; each new annual grant
// vests evenly across its own vesting window, so vesting ramps up over time.
function rsuVesting(inputs: FireInputs, workingYearIndex: number): number {
  const vestYears = Math.max(1, Math.round(inputs.rsu_vest_years || 1));
  const fromUnvested =
    workingYearIndex < vestYears ? n(inputs.rsu_unvested_value) / vestYears : 0;
  const perGrant = n(inputs.rsu_annual_grant) / vestYears;
  const fromGrants = perGrant * Math.min(workingYearIndex + 1, vestYears);
  return fromUnvested + fromGrants;
}

interface SimParams {
  monthlyContribution?: number; // override recurring ETF contribution
  retireAge?: number; // override target retirement age
  startInvestedAtRetire?: number; // inject an invested balance at retirement
}

interface SimResult {
  series: ProjectionYear[];
  raAt55: number;
  cpfLifeMonthly: number; // estimated payout (shown regardless of include flag)
  fundedToAge: number; // age the plan lasts to (== life expectancy if funded)
  investedAtRetire: number;
  netWorthAtRetire: number;
  finalSpendable: number;
}

export function simulate(inputs: FireInputs, params: SimParams = {}): SimResult {
  const retireAge = params.retireAge ?? inputs.target_retire_age;
  const monthly = params.monthlyContribution ?? inputs.monthly_etf_contribution;
  const lifeExpectancy = Math.max(retireAge + 1, inputs.life_expectancy);

  const r = n(inputs.expected_return_pct) / 100;
  const infl = n(inputs.inflation_pct) / 100;
  const targetSum = RETIREMENT_SUMS[inputs.target_retirement_sum] ?? RETIREMENT_SUMS.FRS;
  const escalation = CPF_LIFE_PLAN_FACTORS[inputs.cpf_life_plan]?.annualEscalation ?? 0;
  const yearNow = new Date().getFullYear();

  let invested = n(inputs.current_invested);
  let cash = n(inputs.current_cash);
  let cpf: CpfBalances = {
    oa: n(inputs.cpf_oa),
    sa: n(inputs.cpf_sa),
    ma: n(inputs.cpf_ma),
    ra: 0,
  };

  let raAt55 = 0;
  let cpfLifeMonthly = 0;
  let appliedPayout = 0;
  let fundedToAge = lifeExpectancy;
  let broke = false;
  let workingIdx = 0;

  let investedAtRetire = 0;
  let netWorthAtRetire = 0;

  const series: ProjectionYear[] = [];

  for (let age = inputs.current_age; age <= lifeExpectancy; age++) {
    const working = age < retireAge;

    // Retirement Account forms at 55 (or on entry if already older).
    const formNow =
      age === RA_FORMATION_AGE ||
      (age === inputs.current_age &&
        inputs.current_age > RA_FORMATION_AGE &&
        inputs.current_age < CPF_PAYOUT_AGE &&
        cpf.ra === 0);
    if (formNow) {
      cpf = formRetirementAccount(cpf, targetSum);
      raAt55 = cpf.ra;
      cpfLifeMonthly = estimateCpfLifePayout(raAt55, inputs.cpf_life_plan);
      appliedPayout = inputs.include_cpf_life ? cpfLifeMonthly : 0;
    }

    // Contributions while still working.
    let contribution = 0;
    if (working) {
      const inv = n(monthly) * 12 + rsuVesting(inputs, workingIdx);
      invested += inv;
      contribution = inv;

      const c = annualCpfContribution(
        inputs.monthly_income,
        inputs.annual_bonus,
        age
      );
      cpf.oa += c.oa;
      cpf.ma += c.ma;
      if (age >= RA_FORMATION_AGE) cpf.ra += c.sa;
      else cpf.sa += c.sa;
      workingIdx++;
    }

    // Growth: investments compound; CPF accrues interest. From payout age the
    // RA is converted into the CPF LIFE annuity (premium), so it stops growing
    // as a balance and instead pays out below.
    invested *= 1 + r;
    if (age < CPF_PAYOUT_AGE) {
      cpf = accrueInterest(cpf, age);
    } else {
      const grown = accrueInterest({ ...cpf, ra: 0 }, age);
      cpf = { ...grown, ra: 0 };
    }

    // Snapshot at the moment of retirement (after growth, before drawdown).
    if (age === retireAge) {
      if (params.startInvestedAtRetire !== undefined) {
        invested = params.startInvestedAtRetire;
      }
      investedAtRetire = invested;
      netWorthAtRetire = invested + cash + cpf.oa + cpf.sa + cpf.ma + cpf.ra;
    }

    // Retirement spending.
    let annualExpense = 0;
    let cpfLifeAnnual = 0;
    if (!working) {
      annualExpense =
        n(inputs.monthly_expenses) * 12 * Math.pow(1 + infl, age - inputs.current_age);

      if (appliedPayout > 0 && age >= CPF_PAYOUT_AGE) {
        cpfLifeAnnual =
          appliedPayout * 12 * Math.pow(1 + escalation, age - CPF_PAYOUT_AGE);
      }

      let need = annualExpense - cpfLifeAnnual;
      if (need < 0) {
        // CPF LIFE covers spending; reinvest the surplus.
        invested += -need;
        need = 0;
      } else {
        const fromCash = Math.min(cash, need);
        cash -= fromCash;
        need -= fromCash;
        if (age >= RA_FORMATION_AGE && need > 0) {
          const fromOa = Math.min(cpf.oa, need);
          cpf.oa -= fromOa;
          need -= fromOa;
        }
        if (need > 0) {
          const fromInv = Math.min(invested, need);
          invested -= fromInv;
          need -= fromInv;
        }
        if (need > 1 && !broke) {
          broke = true;
          fundedToAge = age;
        }
      }
    }

    const cpfTotal = cpf.oa + cpf.sa + cpf.ma + cpf.ra;
    const cpfLiquid = age >= RA_FORMATION_AGE ? cpf.oa : 0;
    series.push({
      age,
      year: yearNow + (age - inputs.current_age),
      invested: Math.max(0, invested),
      cpf: cpfTotal,
      cpfLiquid,
      ma: cpf.ma,
      netWorth: Math.max(0, invested) + cash + cpfTotal,
      spendable: Math.max(0, invested) + cash + cpfLiquid,
      annualExpense,
      cpfLifePayout: cpfLifeAnnual,
      contribution,
      phase: working ? "accumulate" : age < CPF_PAYOUT_AGE ? "bridge" : "cpf_life",
    });
  }

  const last = series[series.length - 1];
  return {
    series,
    raAt55,
    cpfLifeMonthly,
    fundedToAge,
    investedAtRetire,
    netWorthAtRetire,
    finalSpendable: last ? last.spendable : 0,
  };
}

// Smallest monthly contribution that funds the plan to life expectancy.
// Returns Infinity if even a very high contribution falls short.
export function requiredMonthlySavings(inputs: FireInputs): number {
  const isFunded = (m: number) =>
    simulate(inputs, { monthlyContribution: m }).fundedToAge >= inputs.life_expectancy;

  if (isFunded(0)) return 0;
  let lo = 0;
  let hi = 100000;
  if (!isFunded(hi)) return Infinity;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (isFunded(mid)) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi);
}

// Invested portfolio required at retirement so the plan lasts to life
// expectancy, given the CPF/cash that will be in place.
export function requiredPortfolioAtRetire(inputs: FireInputs): number {
  const isFunded = (x: number) =>
    simulate(inputs, { startInvestedAtRetire: x }).fundedToAge >= inputs.life_expectancy;

  if (isFunded(0)) return 0;
  let lo = 0;
  let hi = 50_000_000;
  if (!isFunded(hi)) return Infinity;
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2;
    if (isFunded(mid)) hi = mid;
    else lo = mid;
  }
  return Math.round(hi);
}

// Earliest age the plan is fully funded at the current savings rate.
export function earliestFireAge(inputs: FireInputs): number | null {
  for (let age = Math.max(inputs.current_age + 1, 30); age <= 75; age++) {
    if (simulate(inputs, { retireAge: age }).fundedToAge >= inputs.life_expectancy) {
      return age;
    }
  }
  return null;
}

export function buildSummary(inputs: FireInputs): FireSummary {
  const base = simulate(inputs);
  const required = requiredMonthlySavings(inputs);
  const swr = n(inputs.swr_pct) / 100 || 0.04;

  return {
    fireNumber: (n(inputs.monthly_expenses) * 12) / swr,
    requiredPortfolioAtRetire: requiredPortfolioAtRetire(inputs),
    projectedPortfolioAtRetire: base.investedAtRetire,
    projectedNetWorthAtRetire: base.netWorthAtRetire,
    requiredMonthlySavings: required,
    currentMonthlySavings: n(inputs.monthly_etf_contribution),
    savingsGap: required - n(inputs.monthly_etf_contribution),
    earliestFireAge: earliestFireAge(inputs),
    onTrack: base.fundedToAge >= inputs.life_expectancy,
    fundedToAge: base.fundedToAge,
    finalBalance: base.finalSpendable,
    cpfLifeMonthly: base.cpfLifeMonthly,
    raAt55: base.raAt55,
    series: base.series,
  };
}
