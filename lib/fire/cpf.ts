// CPF mechanics: contributions, allocation, interest, Retirement Account
// formation and CPF LIFE payout estimation. Pure functions — safe to import
// from client components for live recalculation.

import type { CpfLifePlan } from "@/types";
import {
  ANNUAL_WAGE_CEILING,
  BASIC_HEALTHCARE_SUM,
  CPF_ALLOCATION_BANDS,
  CPF_CONTRIBUTION_BANDS,
  CPF_EXTRA_INTEREST,
  CPF_INTEREST,
  CPF_LIFE_PLAN_FACTORS,
  CPF_LIFE_STANDARD_ANCHORS,
  OW_CEILING_MONTHLY,
} from "@/lib/data/fire/sg-cpf";

export interface CpfBalances {
  oa: number;
  sa: number;
  ma: number;
  ra: number;
}

export function emptyBalances(): CpfBalances {
  return { oa: 0, sa: 0, ma: 0, ra: 0 };
}

// Total contribution rate (employer + employee) for a given age.
export function cpfTotalRate(age: number): number {
  return (
    CPF_CONTRIBUTION_BANDS.find((b) => age <= b.maxAge)?.total ??
    CPF_CONTRIBUTION_BANDS[CPF_CONTRIBUTION_BANDS.length - 1].total
  );
}

// Employee contribution rate (the slice taken out of take-home pay).
export function cpfEmployeeRate(age: number): number {
  return (
    CPF_CONTRIBUTION_BANDS.find((b) => age <= b.maxAge)?.employee ??
    CPF_CONTRIBUTION_BANDS[CPF_CONTRIBUTION_BANDS.length - 1].employee
  );
}

function allocationFor(age: number) {
  return (
    CPF_ALLOCATION_BANDS.find((b) => age <= b.maxAge) ??
    CPF_ALLOCATION_BANDS[CPF_ALLOCATION_BANDS.length - 1]
  );
}

// Annual CPF inflow across accounts given gross monthly wage + annual bonus,
// honouring both the monthly Ordinary Wage ceiling and the annual wage ceiling.
// For members 55+, the SA share is routed into the RA by the caller.
export function annualCpfContribution(
  monthlyWage: number,
  annualBonus: number,
  age: number
): { oa: number; sa: number; ma: number; total: number } {
  const rate = cpfTotalRate(age);
  const alloc = allocationFor(age);

  // Ordinary Wages capped at the monthly ceiling, summed over the year.
  const cappedMonthly = Math.min(monthlyWage, OW_CEILING_MONTHLY);
  const annualOrdinary = cappedMonthly * 12;

  // Additional Wages (bonus) are subject to CPF only up to the remaining room
  // under the annual ceiling.
  const additionalRoom = Math.max(0, ANNUAL_WAGE_CEILING - annualOrdinary);
  const cappedBonus = Math.min(Math.max(0, annualBonus), additionalRoom);

  const contributableWages = annualOrdinary + cappedBonus;
  const total = contributableWages * rate;

  return {
    oa: total * alloc.oa,
    sa: total * alloc.sa,
    ma: total * alloc.ma,
    total,
  };
}

// Apply one year of interest, including a simplified extra-interest tier and
// the MediSave (BHS) cap. Overflow from a capped MA spills to SA (under 55) or
// OA (55+). Mutates and returns a new balances object.
export function accrueInterest(balances: CpfBalances, age: number): CpfBalances {
  const b = { ...balances };

  // Extra interest on the first tiers of combined balances.
  let extra: number;
  if (age < 55) {
    const oaCounted = Math.min(b.oa, CPF_EXTRA_INTEREST.under55.oaCap);
    const combined = Math.min(
      CPF_EXTRA_INTEREST.under55.cap,
      oaCounted + b.sa + b.ma + b.ra
    );
    extra = combined * CPF_EXTRA_INTEREST.under55.rate;
  } else {
    const pool = b.ra + Math.min(b.oa, 20000) + b.sa + b.ma;
    const tier1 = Math.min(CPF_EXTRA_INTEREST.from55.tier1.cap, pool);
    const tier2 = Math.min(
      CPF_EXTRA_INTEREST.from55.tier2.cap,
      Math.max(0, pool - CPF_EXTRA_INTEREST.from55.tier1.cap)
    );
    extra =
      tier1 * CPF_EXTRA_INTEREST.from55.tier1.rate +
      tier2 * CPF_EXTRA_INTEREST.from55.tier2.rate;
  }

  // Credit base interest to each account, then route extra interest to SA
  // (under 55) or RA (55+), matching CPF practice closely enough.
  b.oa += b.oa * CPF_INTEREST.oa;
  b.ma += b.ma * CPF_INTEREST.ma;
  b.sa += b.sa * CPF_INTEREST.sa;
  b.ra += b.ra * CPF_INTEREST.ra;

  if (age < 55) b.sa += extra;
  else b.ra += extra;

  // MediSave cap: spill the overflow.
  if (b.ma > BASIC_HEALTHCARE_SUM) {
    const overflow = b.ma - BASIC_HEALTHCARE_SUM;
    b.ma = BASIC_HEALTHCARE_SUM;
    if (age < 55) b.sa += overflow;
    else b.oa += overflow;
  }

  return b;
}

// Form the Retirement Account at 55: move SA, then OA, into the RA up to the
// target sum. Anything left over stays in OA (withdrawable from 55). The SA
// then closes.
export function formRetirementAccount(
  balances: CpfBalances,
  targetSum: number
): CpfBalances {
  const b = { ...balances };
  let ra = b.ra;

  const fromSa = Math.min(b.sa, Math.max(0, targetSum - ra));
  ra += fromSa;
  b.sa -= fromSa;

  const fromOa = Math.min(b.oa, Math.max(0, targetSum - ra));
  ra += fromOa;
  b.oa -= fromOa;

  // SA closes at 55; any residual SA (target already met) moves to OA.
  b.oa += b.sa;
  b.sa = 0;
  b.ra = ra;
  return b;
}

// Estimate the monthly CPF LIFE payout (from payout age) for a given RA balance
// at 55, by interpolating the Standard Plan anchors and applying a plan factor.
export function estimateCpfLifePayout(
  raAt55: number,
  plan: CpfLifePlan = "standard"
): number {
  const anchors = CPF_LIFE_STANDARD_ANCHORS;
  let standard: number;

  if (raAt55 <= anchors[0].ra) {
    // Below BRS: scale linearly down from the BRS anchor.
    standard = anchors[0].payout * (raAt55 / anchors[0].ra);
  } else if (raAt55 >= anchors[anchors.length - 1].ra) {
    // Above ERS: extrapolate using the top segment's slope.
    const a = anchors[anchors.length - 2];
    const z = anchors[anchors.length - 1];
    const slope = (z.payout - a.payout) / (z.ra - a.ra);
    standard = z.payout + slope * (raAt55 - z.ra);
  } else {
    // Interpolate between bracketing anchors.
    let lo = anchors[0];
    let hi = anchors[anchors.length - 1];
    for (let i = 0; i < anchors.length - 1; i++) {
      if (raAt55 >= anchors[i].ra && raAt55 <= anchors[i + 1].ra) {
        lo = anchors[i];
        hi = anchors[i + 1];
        break;
      }
    }
    const t = (raAt55 - lo.ra) / (hi.ra - lo.ra);
    standard = lo.payout + t * (hi.payout - lo.payout);
  }

  const factor = CPF_LIFE_PLAN_FACTORS[plan]?.startFactor ?? 1;
  return Math.max(0, standard * factor);
}
