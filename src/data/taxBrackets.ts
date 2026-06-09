export interface Bracket {
  limit: number;
  rate: number;
}

export const FEDERAL_BRACKETS_SINGLE_2024: Bracket[] = [
  { limit: 11600, rate: 0.10 },
  { limit: 47150, rate: 0.12 },
  { limit: 100525, rate: 0.22 },
  { limit: 191950, rate: 0.24 },
  { limit: 243725, rate: 0.32 },
  { limit: 609350, rate: 0.35 },
  { limit: Infinity, rate: 0.37 },
];

export const FEDERAL_BRACKETS_MARRIED_2024: Bracket[] = [
  { limit: 23200, rate: 0.10 },
  { limit: 94300, rate: 0.12 },
  { limit: 201050, rate: 0.22 },
  { limit: 383900, rate: 0.24 },
  { limit: 487450, rate: 0.32 },
  { limit: 731200, rate: 0.35 },
  { limit: Infinity, rate: 0.37 },
];

export const STANDARD_DEDUCTION_2024 = {
  single: 14600,
  married: 29200,
} as const;

export const TRADITIONAL_401K_LIMIT_2024 = 23000;
export const CATCH_UP_401K_LIMIT_2024 = 30500;

export const SS_WAGE_BASE_2024 = 168600;
export const SS_RATE = 0.062;
export const MEDICARE_RATE = 0.0145;
export const CA_SDI_RATE = 0.011;
