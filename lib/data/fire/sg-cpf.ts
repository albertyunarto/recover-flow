// Singapore CPF & retirement constants — figures effective 2026.
//
// Sources (verified): CPF Board (cpf.gov.sg) and MOM.
//  - Ordinary Wage ceiling rises to $8,000/month from 1 Jan 2026.
//  - Annual salary ceiling stays at $102,000.
//  - Contribution rate for members aged 55 & below stays at 37% (17% employer
//    + 20% employee).
//  - Retirement sums for members turning 55 in 2026: BRS $110,200,
//    FRS $220,400 (2x BRS), ERS $440,800 (4x BRS).
//  - CPF LIFE Standard Plan payouts from age 65 (2026 turn-55 cohort):
//    ~$950 (BRS), ~$1,780 (FRS), ~$3,440 (ERS) per month.
//
// These are planning estimates only and should be reviewed each year. Every
// assumption that materially affects a projection is editable in the planner.

import type { RetirementSumTier } from "@/types";

export const CPF_YEAR = 2026;

// CPF only applies to monthly Ordinary Wages up to this ceiling.
export const OW_CEILING_MONTHLY = 8000;
// Total annual wages (Ordinary + Additional, e.g. bonus) subject to CPF.
export const ANNUAL_WAGE_CEILING = 102000;

// MediSave Account is capped at the Basic Healthcare Sum (2026 estimate).
export const BASIC_HEALTHCARE_SUM = 75500;

// Age at which the Special Account closes and the Retirement Account is formed.
export const RA_FORMATION_AGE = 55;
// Age at which CPF LIFE payouts begin.
export const CPF_PAYOUT_AGE = 65;

// Total CPF contribution rate (employer + employee) by age band. The dominant
// case is "55 & below" at 37%. Senior-worker bands use 2026 figures and are
// approximate — early retirees stop contributing before they reach them.
export interface CpfRateBand {
  maxAge: number; // inclusive upper bound
  total: number; // employer + employee
  employee: number; // employee share (used for take-home math)
}

export const CPF_CONTRIBUTION_BANDS: CpfRateBand[] = [
  { maxAge: 55, total: 0.37, employee: 0.2 },
  { maxAge: 60, total: 0.34, employee: 0.18 }, // +1.5% from 2026
  { maxAge: 65, total: 0.25, employee: 0.135 },
  { maxAge: 70, total: 0.165, employee: 0.075 },
  { maxAge: 200, total: 0.125, employee: 0.05 },
];

// Allocation of the total contribution across OA / SA / MA, as a fraction of
// the contribution (2026 rates). Fractions sum to 1 within each band.
export interface CpfAllocationBand {
  maxAge: number;
  oa: number;
  sa: number;
  ma: number;
}

export const CPF_ALLOCATION_BANDS: CpfAllocationBand[] = [
  { maxAge: 35, oa: 0.6217, sa: 0.1621, ma: 0.2162 },
  { maxAge: 45, oa: 0.5677, sa: 0.1891, ma: 0.2432 },
  { maxAge: 50, oa: 0.5136, sa: 0.2162, ma: 0.2702 },
  { maxAge: 55, oa: 0.4055, sa: 0.3108, ma: 0.2837 },
  // 55+: the retirement share is routed to the RA in the projection engine.
  { maxAge: 200, oa: 0.4055, sa: 0.3108, ma: 0.2837 },
];

// Annual interest rates. SA/MA/RA carry a 4% floor (extended through 2026).
export const CPF_INTEREST = {
  oa: 0.025,
  sa: 0.04,
  ma: 0.04,
  ra: 0.04,
} as const;

// Extra interest (simplified). Under 55: +1% on the first $60k of combined
// balances (max $20k counted from OA). 55+: +2% on the first $30k and +1% on
// the next $30k.
export const CPF_EXTRA_INTEREST = {
  under55: { rate: 0.01, cap: 60000, oaCap: 20000 },
  from55: {
    tier1: { rate: 0.02, cap: 30000 },
    tier2: { rate: 0.01, cap: 30000 },
  },
} as const;

// Retirement sums for members turning 55 in 2026.
export const RETIREMENT_SUMS: Record<RetirementSumTier, number> = {
  BRS: 110200,
  FRS: 220400,
  ERS: 440800,
};

export const RETIREMENT_SUM_LABELS: Record<RetirementSumTier, string> = {
  BRS: "Basic (BRS)",
  FRS: "Full (FRS)",
  ERS: "Enhanced (ERS)",
};

// CPF LIFE Standard Plan — estimated monthly payout from age 65, keyed by the
// Retirement Account sum set aside at 55 (turn-55-in-2026 cohort). Used as
// anchor points for interpolation.
export const CPF_LIFE_STANDARD_ANCHORS: { ra: number; payout: number }[] = [
  { ra: RETIREMENT_SUMS.BRS, payout: 950 },
  { ra: RETIREMENT_SUMS.FRS, payout: 1780 },
  { ra: RETIREMENT_SUMS.ERS, payout: 3440 },
];

// Rough multipliers vs the Standard Plan's initial payout. The Basic Plan pays
// a little less up front; the Escalating Plan starts ~20% lower then grows 2%/yr.
export const CPF_LIFE_PLAN_FACTORS = {
  standard: { startFactor: 1.0, annualEscalation: 0 },
  basic: { startFactor: 0.95, annualEscalation: 0 },
  escalating: { startFactor: 0.8, annualEscalation: 0.02 },
} as const;
