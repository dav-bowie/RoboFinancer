import { fmtCurrency } from "./calculations";
import type { CashFlowExpenses } from "./cashFlowModel";
import type { BalanceSheetState } from "./balanceSheetModel";
import { IRS_ROTH_IRA_2026 } from "./contributionLimits";

export type SavingsGoal = "emergency_first" | "balanced" | "growth_focused";

export interface AllocationPreferences {
  savingsGoal: SavingsGoal;
  /** Months of essential spending for emergency fund target (default 12) */
  emergencyFundMonths: number;
}

export const DEFAULT_ALLOCATION_PREFERENCES: AllocationPreferences = {
  savingsGoal: "balanced",
  emergencyFundMonths: 12,
};

export type BucketId =
  | "highYieldSavings"
  | "rothIRA"
  | "brokerage"
  | "k401"
  | "hsa";

export interface AllocationBucket {
  id: BucketId;
  label: string;
  description: string;
  color: string;
  /** Current account balance */
  currentBalance: number;
  /** Target balance (emergency fund) or annual IRS max context */
  targetBalance: number;
  /** Recommended $/mo from available savings */
  recommendedMonthly: number;
  /** User's actual $/mo contribution from cash flow */
  actualMonthly: number;
  /** Fill ratio 0–1 for visual */
  progress: number;
  /** Is this bucket highlighted as a recommendation */
  recommended: boolean;
  note?: string;
}

export interface AllocationPlan {
  monthlyEssentialSpending: number;
  monthlyTotalSpending: number;
  emergencyFundTarget: number;
  monthlySavingsPool: number;
  buckets: AllocationBucket[];
  summary: string;
  topRecommendation: string;
}

const BUCKET_META: Record<
  BucketId,
  { label: string; description: string; color: string }
> = {
  highYieldSavings: {
    label: "High-Yield Savings",
    description: "Emergency fund — liquid cash for 6–12 months of essentials",
    color: "#0ea5e9",
  },
  rothIRA: {
    label: "Roth IRA",
    description: "Post-tax retirement — tax-free growth and qualified withdrawals",
    color: "#10b981",
  },
  brokerage: {
    label: "Brokerage / Portfolio",
    description: "Taxable investing for medium-term goals and wealth building",
    color: "#6366f1",
  },
  k401: {
    label: "401(k)",
    description: "Pre-tax retirement — already deducted from gross pay",
    color: "#8b5cf6",
  },
  hsa: {
    label: "HSA",
    description: "Triple tax-advantaged for medical expenses",
    color: "#14b8a6",
  },
};

function sumNecessary(expenses: CashFlowExpenses): number {
  return Object.values(expenses.necessary).reduce((a, b) => a + b, 0);
}

function sumAllSpending(expenses: CashFlowExpenses): number {
  const n = Object.values(expenses.necessary).reduce((a, b) => a + b, 0);
  const l = Object.values(expenses.lifestyle).reduce((a, b) => a + b, 0);
  const s = Object.values(expenses.savingsRisk).reduce((a, b) => a + b, 0);
  return n + l + s;
}

export function calcEmergencyFundTarget(
  monthlyEssentialSpending: number,
  months: number,
): number {
  return Math.round(monthlyEssentialSpending * months);
}

/** Distribute monthly savings pool across buckets based on user goal and gaps */
function distributeMonthlySavings(
  pool: number,
  prefs: AllocationPreferences,
  gaps: Record<BucketId, number>,
  rothAnnualMax: number,
  rothYtdContrib: number,
): Record<BucketId, number> {
  const result: Record<BucketId, number> = {
    highYieldSavings: 0,
    rothIRA: 0,
    brokerage: 0,
    k401: 0,
    hsa: 0,
  };

  if (pool <= 0) return result;

  let remaining = pool;
  const rothRoom = Math.max(0, (rothAnnualMax - rothYtdContrib) / 12);

  if (prefs.savingsGoal === "emergency_first") {
    const toEmergency = Math.min(remaining, gaps.highYieldSavings > 0 ? gaps.highYieldSavings / 12 : 0);
    result.highYieldSavings = Math.min(remaining, Math.max(toEmergency, remaining * 0.5));
    remaining -= result.highYieldSavings;
    result.rothIRA = Math.min(remaining, rothRoom, remaining * 0.35);
    remaining -= result.rothIRA;
    result.brokerage = remaining;
  } else if (prefs.savingsGoal === "growth_focused") {
    result.rothIRA = Math.min(remaining, rothRoom, remaining * 0.45);
    remaining -= result.rothIRA;
    result.brokerage = Math.min(remaining, remaining * 0.4);
    remaining -= result.brokerage;
    result.highYieldSavings = remaining;
  } else {
    // balanced
    const emergencyShare = gaps.highYieldSavings > 0 ? 0.35 : 0.2;
    result.highYieldSavings = remaining * emergencyShare;
    result.rothIRA = Math.min(remaining * 0.35, rothRoom);
    result.brokerage = remaining - result.highYieldSavings - result.rothIRA;
  }

  return result;
}

export function buildAllocationPlan(
  expenses: CashFlowExpenses,
  balanceSheet: BalanceSheetState,
  takeHome: {
    k401Amount: number;
    hsaAmount: number;
    rothIRA: number;
    grossSalary: number;
  },
  prefs: AllocationPreferences,
  monthlyTakeHome: number,
): AllocationPlan {
  const monthlyEssential = sumNecessary(expenses);
  const monthlyTotal = sumAllSpending(expenses);
  const emergencyFundTarget = calcEmergencyFundTarget(
    monthlyEssential,
    prefs.emergencyFundMonths,
  );

  const hysBalance =
    balanceSheet.nonRetirement.savings + balanceSheet.nonRetirement.moneyMarket;
  const brokerageBalance = balanceSheet.nonRetirement.brokerage;
  const rothBalance = balanceSheet.retirement.rothIRA;
  const k401Balance = balanceSheet.retirement.k401;
  const hsaBalance = balanceSheet.retirement.hsa;

  const monthlySavingsPool =
    expenses.savingsRisk.emergencySavings +
    expenses.savingsRisk.investmentAccount +
    expenses.savingsRisk.rothIRA;

  const gaps: Record<BucketId, number> = {
    highYieldSavings: Math.max(0, emergencyFundTarget - hysBalance),
    rothIRA: Math.max(0, IRS_ROTH_IRA_2026 - takeHome.rothIRA),
    brokerage: 0,
    k401: 0,
    hsa: 0,
  };

  const recommended = distributeMonthlySavings(
    Math.max(monthlySavingsPool, monthlyTakeHome * 0.15),
    prefs,
    gaps,
    IRS_ROTH_IRA_2026,
    takeHome.rothIRA,
  );

  const actualMonthly: Record<BucketId, number> = {
    highYieldSavings: expenses.savingsRisk.emergencySavings,
    rothIRA: expenses.savingsRisk.rothIRA,
    brokerage: expenses.savingsRisk.investmentAccount,
    k401: takeHome.k401Amount / 12,
    hsa: takeHome.hsaAmount / 12,
  };

  const isEmergencyLow = hysBalance < emergencyFundTarget * 0.5;
  const isRothUnderfunded = takeHome.rothIRA < IRS_ROTH_IRA_2026 * 0.5;

  const buckets: AllocationBucket[] = (
    ["highYieldSavings", "rothIRA", "brokerage", "k401", "hsa"] as BucketId[]
  ).map((id) => {
    const meta = BUCKET_META[id];
    let currentBalance = 0;
    let targetBalance = 0;
    let note: string | undefined;

    switch (id) {
      case "highYieldSavings":
        currentBalance = hysBalance;
        targetBalance = emergencyFundTarget;
        note = `${prefs.emergencyFundMonths} mo × ${fmtCurrency(monthlyEssential)}/mo essentials`;
        break;
      case "rothIRA":
        currentBalance = rothBalance;
        targetBalance = IRS_ROTH_IRA_2026;
        note = `IRS ${fmtCurrency(IRS_ROTH_IRA_2026)}/yr limit`;
        break;
      case "brokerage":
        currentBalance = brokerageBalance;
        targetBalance = Math.max(brokerageBalance, monthlySavingsPool * 12 * 5);
        break;
      case "k401":
        currentBalance = k401Balance;
        targetBalance = Math.max(k401Balance, takeHome.k401Amount);
        note = "Pre-tax — deducted from gross";
        break;
      case "hsa":
        currentBalance = hsaBalance;
        targetBalance = Math.max(hsaBalance, takeHome.hsaAmount);
        note = takeHome.hsaAmount > 0 ? "Pre-tax — reduces federal AGI" : undefined;
        break;
    }

    const progress =
      targetBalance > 0 ? Math.min(1, currentBalance / targetBalance) : 0;

    let recommendedFlag = false;
    if (prefs.savingsGoal === "emergency_first" && id === "highYieldSavings" && isEmergencyLow)
      recommendedFlag = true;
    if (prefs.savingsGoal === "growth_focused" && id === "rothIRA" && isRothUnderfunded)
      recommendedFlag = true;
    if (prefs.savingsGoal === "balanced" && (id === "highYieldSavings" || id === "rothIRA"))
      recommendedFlag = isEmergencyLow || isRothUnderfunded;

    return {
      id,
      label: meta.label,
      description: meta.description,
      color: meta.color,
      currentBalance,
      targetBalance,
      recommendedMonthly: Math.round(recommended[id]),
      actualMonthly: Math.round(actualMonthly[id]),
      progress,
      recommended: recommendedFlag,
      note,
    };
  });

  const topBucket = [...buckets]
    .filter((b) => b.recommended)
    .sort((a, b) => b.recommendedMonthly - a.recommendedMonthly)[0];

  const goalLabels: Record<SavingsGoal, string> = {
    emergency_first: "building your emergency fund first",
    balanced: "balancing safety and long-term growth",
    growth_focused: "maximizing tax-advantaged and portfolio growth",
  };

  let topRecommendation = "Adjust your savings goal to see personalized bucket recommendations.";
  if (topBucket) {
    topRecommendation = `Prioritize ${topBucket.label}: contribute ~${fmtCurrency(topBucket.recommendedMonthly)}/mo toward your ${topBucket.label.toLowerCase()} bucket while ${goalLabels[prefs.savingsGoal]}.`;
  } else if (prefs.savingsGoal === "growth_focused") {
    topRecommendation = `Consider maxing Roth IRA (${fmtCurrency(IRS_ROTH_IRA_2026)}/yr) then brokerage for long-term growth.`;
  }

  const emergencyPct = emergencyFundTarget > 0
    ? Math.round((hysBalance / emergencyFundTarget) * 100)
    : 0;

  const summary =
    emergencyPct >= 100
      ? `Your high-yield savings covers ${prefs.emergencyFundMonths} months of essentials (${fmtCurrency(emergencyFundTarget)}). Shift focus to Roth IRA and brokerage.`
      : `Emergency fund: ${emergencyPct}% of ${fmtCurrency(emergencyFundTarget)} target (${prefs.emergencyFundMonths}× monthly essentials). ${fmtCurrency(gaps.highYieldSavings)} still needed.`;

  return {
    monthlyEssentialSpending: monthlyEssential,
    monthlyTotalSpending: monthlyTotal,
    emergencyFundTarget,
    monthlySavingsPool,
    buckets,
    summary,
    topRecommendation,
  };
}

/** Map allocation bucket suggestions onto editable cash-flow line items */
export function applyAllocationSuggestions(
  expenses: CashFlowExpenses,
  plan: AllocationPlan,
): CashFlowExpenses {
  const byId = Object.fromEntries(plan.buckets.map((b) => [b.id, b])) as Record<
    BucketId,
    AllocationBucket
  >;

  return {
    ...expenses,
    savingsRisk: {
      ...expenses.savingsRisk,
      emergencySavings: byId.highYieldSavings.recommendedMonthly,
      rothIRA: byId.rothIRA.recommendedMonthly,
      investmentAccount: byId.brokerage.recommendedMonthly,
    },
  };
}

export const SAVINGS_GOAL_OPTIONS: {
  value: SavingsGoal;
  label: string;
  hint: string;
}[] = [
  {
    value: "emergency_first",
    label: "Emergency fund first",
    hint: "Fill high-yield savings to 12 months of essentials before heavy investing.",
  },
  {
    value: "balanced",
    label: "Balanced",
    hint: "Split savings across emergency cash, Roth IRA, and brokerage.",
  },
  {
    value: "growth_focused",
    label: "Portfolio growth",
    hint: "Prioritize Roth IRA and brokerage; keep minimum emergency cushion.",
  },
];
