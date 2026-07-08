export interface NonRetirementAccounts {
  checking: number;
  savings: number;
  moneyMarket: number;
  brokerage: number;
}

export interface RetirementAccounts {
  k401: number;
  rothIRA: number;
  tradIRA: number;
  hsa: number;
}

export interface PersonalAssets {
  residence: number;
  autos: number;
  other: number;
}

export interface Liabilities {
  creditCards: number;
  studentLoans: number;
  autoLoans: number;
  other: number;
}

export interface BalanceSheetState {
  nonRetirement: NonRetirementAccounts;
  retirement: RetirementAccounts;
  assets: PersonalAssets;
  liabilities: Liabilities;
}

export const DEFAULT_BALANCE_SHEET: BalanceSheetState = {
  nonRetirement: {
    checking: 1000,
    savings: 11000,
    moneyMarket: 0,
    brokerage: 93300,
  },
  retirement: {
    k401: 11000,
    rothIRA: 19170,
    tradIRA: 0,
    hsa: 519,
  },
  assets: {
    residence: 0,
    autos: 27000,
    other: 0,
  },
  liabilities: {
    creditCards: 0,
    studentLoans: 0,
    autoLoans: 0,
    other: 0,
  },
};

export function sumSection(values: Record<string, number>): number {
  return Object.values(values).reduce((a, b) => a + b, 0);
}

export function calcBalanceSheetTotals(sheet: BalanceSheetState) {
  const nonRetirementTotal = sumSection(sheet.nonRetirement);
  const retirementTotal = sumSection(sheet.retirement);
  const assetsTotal = sumSection(sheet.assets);
  const liabilitiesTotal = sumSection(sheet.liabilities);
  const totalAssets = nonRetirementTotal + retirementTotal + assetsTotal;
  const netWorth = totalAssets - liabilitiesTotal;

  return {
    nonRetirementTotal,
    retirementTotal,
    assetsTotal,
    liabilitiesTotal,
    totalAssets,
    netWorth,
  };
}

export function updateBalanceSheetField<
  S extends keyof BalanceSheetState,
  K extends keyof BalanceSheetState[S],
>(sheet: BalanceSheetState, section: S, field: K, value: number): BalanceSheetState {
  return {
    ...sheet,
    [section]: {
      ...sheet[section],
      [field]: Math.max(0, value),
    },
  };
}

export const BALANCE_SHEET_LABELS = {
  nonRetirement: {
    checking: "Checking",
    savings: "High-Yield Savings",
    moneyMarket: "Money Market / HYSA",
    brokerage: "Brokerage / Portfolio",
  },
  retirement: {
    k401: "401(k)",
    rothIRA: "Roth IRA",
    tradIRA: "Traditional IRA",
    hsa: "HSA",
  },
  assets: {
    residence: "Residence",
    autos: "Autos",
    other: "Other Property",
  },
  liabilities: {
    creditCards: "Credit Cards",
    studentLoans: "Student Loans",
    autoLoans: "Auto Loans",
    other: "Other Debt",
  },
} as const;
