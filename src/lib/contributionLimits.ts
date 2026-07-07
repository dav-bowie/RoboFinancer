/** IRS contribution limits — 2026 tax year */

export const IRS_401K_ELECTIVE_DEFERRAL_2026 = 24500;
export const IRS_401K_CATCH_UP_2026 = 8000; // age 50+

export const IRS_HSA_SELF_2026 = 4300;
export const IRS_HSA_FAMILY_2026 = 8550;
export const IRS_HSA_CATCH_UP_2026 = 1000; // age 55+

export const IRS_ROTH_IRA_2026 = 7500;
export const IRS_ROTH_IRA_CATCH_UP_2026 = 8500; // age 50+

export type HsaCoverage = "self" | "family";

export interface ContributionLimitSettings {
  age50Plus: boolean;
  age55Plus: boolean;
  hsaCoverage: HsaCoverage;
  /** Employer policy: max match as % of salary (e.g. 6 = match up to 6% of pay) */
  employerMatchLimitPct: number;
}

export const DEFAULT_LIMIT_SETTINGS: ContributionLimitSettings = {
  age50Plus: false,
  age55Plus: false,
  hsaCoverage: "self",
  employerMatchLimitPct: 6,
};

export interface ComputedContributionLimits {
  k401Max: number;
  hsaMax: number;
  rothIraMax: number;
  employerMatchMax: number;
}

export function computeContributionLimits(
  grossSalary: number,
  settings: ContributionLimitSettings,
): ComputedContributionLimits {
  const k401IrsMax =
    IRS_401K_ELECTIVE_DEFERRAL_2026 + (settings.age50Plus ? IRS_401K_CATCH_UP_2026 : 0);

  const hsaBase =
    settings.hsaCoverage === "family" ? IRS_HSA_FAMILY_2026 : IRS_HSA_SELF_2026;
  const hsaMax = hsaBase + (settings.age55Plus ? IRS_HSA_CATCH_UP_2026 : 0);

  const rothIraMax = settings.age50Plus ? IRS_ROTH_IRA_CATCH_UP_2026 : IRS_ROTH_IRA_2026;

  const employerMatchMax = Math.round(
    grossSalary * (Math.min(Math.max(settings.employerMatchLimitPct, 0), 100) / 100),
  );

  return {
    k401Max: Math.min(k401IrsMax, Math.max(0, grossSalary)),
    hsaMax,
    rothIraMax,
    employerMatchMax,
  };
}

export function clampContribution(value: number, max: number): number {
  return Math.min(Math.max(0, value), Math.max(0, max));
}

export function k401MaxRatePct(grossSalary: number, max: number): number {
  if (grossSalary <= 0 || max <= 0) return 0;
  return Math.min(100, (max / grossSalary) * 100);
}

export function k401RateFromAmount(grossSalary: number, amount: number): number {
  if (grossSalary <= 0) return 0;
  return (amount / grossSalary) * 100;
}

export function k401AmountFromRate(grossSalary: number, rate: number, max: number): number {
  return clampContribution(Math.round(grossSalary * (rate / 100)), max);
}
