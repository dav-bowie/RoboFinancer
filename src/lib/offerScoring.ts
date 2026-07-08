import { COST_OF_LIVING_INDEX, fmtCurrency } from "./calculations";

export type WorkStyle = "remote" | "hybrid" | "in_office";
export type HouseholdType = "single" | "couple";
export type CompFocus = "cash_now" | "balanced" | "long_term";

export interface OfferProfile {
  company: string;
  city: string;
  baseSalary: number;
  bonus: number;
  equity: number;
  retirementRate: number;
  commuteCost: number;
  commuteHrsWeek: number;
  workStyle: WorkStyle;
  adjustedTakeHome: number;
  netTakeHome: number;
  annualCommuteCost: number;
  annualCommuteTimeHrs: number;
  colIndex: number;
}

export interface UserPreferences {
  compFocus: CompFocus;
  workPreference: WorkStyle;
  /** How much commute matters (0–100) */
  commuteImportance: number;
  household: HouseholdType;
  /** How much guaranteed income matters vs variable comp (0–100) */
  financialStability: number;
}

export interface HousingPricing {
  min: number;
  max: number;
  avg: number;
}

export interface ScoreDimension {
  id: string;
  label: string;
  weight: number;
  score: number;
  detail: string;
  favors: "current" | "new" | "neutral";
}

export interface WeightedVerdict {
  weightedScore: number;
  winner: "new" | "current" | "tie";
  dimensions: ScoreDimension[];
  summary: string;
  rawFinancialDelta: number;
}

/** National median rent baseline (monthly), scaled by CoL index / 100 */
const BASE_RENT_1BR = 1500;
const BASE_RENT_2BR = 1900;

const COMP_FOCUS_TILT: Record<CompFocus, number> = {
  cash_now: -1,
  balanced: 0,
  long_term: 1,
};

export function estimateMonthlyRent(city: string, household: HouseholdType): number {
  const col = COST_OF_LIVING_INDEX[city] ?? 100;
  const base = household === "couple" ? BASE_RENT_2BR : BASE_RENT_1BR;
  return Math.round((base * col) / 100);
}

/** Location-based rent range derived from CoL index (low / median / high market) */
export function getHousingPricing(city: string, household: HouseholdType): HousingPricing {
  const avg = estimateMonthlyRent(city, household);
  return {
    min: Math.round(avg * 0.72),
    max: Math.round(avg * 1.45),
    avg,
  };
}

export function formatHousingRange(pricing: HousingPricing): string {
  return `${fmtCurrency(pricing.min)} – ${fmtCurrency(pricing.max)} (avg ${fmtCurrency(pricing.avg)})`;
}

function workStyleMatch(preferred: WorkStyle, actual: WorkStyle): number {
  const scores: Record<WorkStyle, Record<WorkStyle, number>> = {
    remote: { remote: 100, hybrid: 55, in_office: 10 },
    hybrid: { remote: 70, hybrid: 100, in_office: 45 },
    in_office: { remote: 20, hybrid: 60, in_office: 100 },
  };
  return scores[preferred][actual];
}

function normalizeDelta(delta: number, scale: number): number {
  if (scale <= 0) return 0;
  return Math.max(-100, Math.min(100, (delta / scale) * 100));
}

function winnerFromScore(score: number): "new" | "current" | "tie" {
  if (score > 12) return "new";
  if (score < -12) return "current";
  return "tie";
}

export function computeWeightedVerdict(
  current: OfferProfile,
  next: OfferProfile,
  prefs: UserPreferences,
  impliedHourlyRate: number,
): WeightedVerdict {
  const rawFinancialDelta = next.adjustedTakeHome - current.adjustedTakeHome;
  const financialScale = Math.max(15000, Math.abs(rawFinancialDelta) * 1.5, current.adjustedTakeHome * 0.08);

  const cashNowDelta = next.baseSalary + next.bonus - (current.baseSalary + current.bonus);
  const equityDelta = next.equity - current.equity;
  const equityTilt = COMP_FOCUS_TILT[prefs.compFocus];
  const compMixDelta = cashNowDelta * (1 - equityTilt) + equityDelta * (1 + equityTilt);
  const compMixScale = Math.max(
    20000,
    Math.abs(cashNowDelta) + Math.abs(equityDelta),
    (current.baseSalary + current.equity) * 0.1,
  );

  const guaranteedDelta =
    next.baseSalary - current.baseSalary + (next.bonus - current.bonus) * 0.5;
  const stabilityScale = Math.max(15000, Math.abs(guaranteedDelta), current.baseSalary * 0.08);

  const commuteCostDelta = current.annualCommuteCost - next.annualCommuteCost;
  const commuteTimeDelta =
    (current.annualCommuteTimeHrs - next.annualCommuteTimeHrs) * impliedHourlyRate;
  const commuteDelta = commuteCostDelta + commuteTimeDelta;
  const commuteScale = Math.max(5000, Math.abs(commuteDelta), impliedHourlyRate * 100);

  const currentHousing = getHousingPricing(current.city, prefs.household);
  const nextHousing = getHousingPricing(next.city, prefs.household);
  const currentRentBurden = (currentHousing.avg * 12) / Math.max(current.netTakeHome, 1);
  const nextRentBurden = (nextHousing.avg * 12) / Math.max(next.netTakeHome, 1);
  const housingDelta = (currentRentBurden - nextRentBurden) * current.netTakeHome;
  const housingScale = Math.max(8000, Math.abs(housingDelta), currentHousing.avg * 4);

  const currentWorkMatch = workStyleMatch(prefs.workPreference, current.workStyle);
  const nextWorkMatch = workStyleMatch(prefs.workPreference, next.workStyle);
  const workStyleDelta = nextWorkMatch - currentWorkMatch;

  const weights = {
    financial: 35 + prefs.financialStability * 0.25,
    compMix: prefs.compFocus === "balanced" ? 8 : 20,
    stability: 5 + prefs.financialStability * 0.45,
    commute: 8 + prefs.commuteImportance * 0.55,
    housing: 22,
    workStyle: 18,
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  const compMixLabels: Record<CompFocus, string> = {
    cash_now: "Near-term cash comp",
    balanced: "Balanced comp mix",
    long_term: "Long-term comp mix",
  };

  const dimensions: ScoreDimension[] = [
    {
      id: "financial",
      label: "CoL-adjusted take-home",
      weight: weights.financial / totalWeight,
      score: normalizeDelta(rawFinancialDelta, financialScale),
      detail: `${rawFinancialDelta >= 0 ? "+" : ""}${fmtCurrency(rawFinancialDelta)}/yr after taxes, equity, commute, and cost of living`,
      favors:
        rawFinancialDelta > 3000 ? "new" : rawFinancialDelta < -3000 ? "current" : "neutral",
    },
    {
      id: "compMix",
      label: compMixLabels[prefs.compFocus],
      weight: weights.compMix / totalWeight,
      score: normalizeDelta(compMixDelta, compMixScale),
      detail:
        prefs.compFocus === "long_term"
          ? `Equity delta ${equityDelta >= 0 ? "+" : ""}${fmtCurrency(equityDelta)}/yr weighted toward upside`
          : prefs.compFocus === "cash_now"
            ? `Base+bonus delta ${cashNowDelta >= 0 ? "+" : ""}${fmtCurrency(cashNowDelta)}/yr weighted toward guaranteed pay`
            : `Base+bonus ${cashNowDelta >= 0 ? "+" : ""}${fmtCurrency(cashNowDelta)}/yr · equity ${equityDelta >= 0 ? "+" : ""}${fmtCurrency(equityDelta)}/yr`,
      favors: compMixDelta > 5000 ? "new" : compMixDelta < -5000 ? "current" : "neutral",
    },
    {
      id: "stability",
      label: "Income stability",
      weight: weights.stability / totalWeight,
      score: normalizeDelta(guaranteedDelta, stabilityScale),
      detail: `Base+bonus delta ${guaranteedDelta >= 0 ? "+" : ""}${fmtCurrency(guaranteedDelta)}/yr in more predictable pay`,
      favors: guaranteedDelta > 5000 ? "new" : guaranteedDelta < -5000 ? "current" : "neutral",
    },
    {
      id: "commute",
      label: "Commute cost & time",
      weight: weights.commute / totalWeight,
      score: normalizeDelta(commuteDelta, commuteScale),
      detail: `Saves ${fmtCurrency(Math.max(0, commuteDelta))} when comparing money + ${Math.max(0, current.annualCommuteTimeHrs - next.annualCommuteTimeHrs)} fewer commute hrs/yr`,
      favors: commuteDelta > 2000 ? "new" : commuteDelta < -2000 ? "current" : "neutral",
    },
    {
      id: "housing",
      label: "Housing affordability",
      weight: weights.housing / totalWeight,
      score: normalizeDelta(housingDelta, housingScale),
      detail: `${next.city}: ${formatHousingRange(nextHousing)} vs ${current.city}: ${formatHousingRange(currentHousing)} (${prefs.household === "couple" ? "2BR" : "1BR"})`,
      favors: housingDelta > 2000 ? "new" : housingDelta < -2000 ? "current" : "neutral",
    },
    {
      id: "workStyle",
      label: "Work preference fit",
      weight: weights.workStyle / totalWeight,
      score: workStyleDelta,
      detail: `${next.workStyle.replace("_", "-")} (${nextWorkMatch}% match) vs ${current.workStyle.replace("_", "-")} (${currentWorkMatch}% match) for your ${WORK_STYLE_LABELS[prefs.workPreference].toLowerCase()} preference`,
      favors: workStyleDelta > 15 ? "new" : workStyleDelta < -15 ? "current" : "neutral",
    },
  ];

  const weightedScore = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  const winner = winnerFromScore(weightedScore);

  const topFactors = [...dimensions]
    .sort((a, b) => Math.abs(b.score * b.weight) - Math.abs(a.score * a.weight))
    .slice(0, 3)
    .filter((d) => Math.abs(d.score) > 8);

  const summary =
    winner === "new"
      ? `Weighted toward ${next.company} (${weightedScore > 0 ? "+" : ""}${Math.round(weightedScore)} pts). Key drivers: ${topFactors.map((d) => d.label.toLowerCase()).join(", ") || "overall financial advantage"}.`
      : winner === "current"
        ? `Weighted toward staying at ${current.company} (${Math.round(weightedScore)} pts). Key drivers: ${topFactors.map((d) => d.label.toLowerCase()).join(", ") || "overall financial advantage"}.`
        : `Offers are close for your profile (${Math.round(weightedScore)} pts). Weigh ${topFactors.map((d) => d.label.toLowerCase()).join(", ") || "growth, team, and non-financial factors"} before deciding.`;

  return {
    weightedScore,
    winner,
    dimensions,
    summary,
    rawFinancialDelta,
  };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  compFocus: "balanced",
  workPreference: "hybrid",
  commuteImportance: 60,
  household: "single",
  financialStability: 50,
};

export const WORK_STYLE_LABELS: Record<WorkStyle, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  in_office: "In-person",
};

export const COMP_FOCUS_OPTIONS: { value: CompFocus; label: string; hint: string }[] = [
  {
    value: "cash_now",
    label: "Cash now",
    hint: "Prioritize higher base salary and bonus over equity.",
  },
  {
    value: "balanced",
    label: "Balanced",
    hint: "Weight base, bonus, and equity equally.",
  },
  {
    value: "long_term",
    label: "Long-term upside",
    hint: "Prioritize equity and future growth over near-term cash.",
  },
];
