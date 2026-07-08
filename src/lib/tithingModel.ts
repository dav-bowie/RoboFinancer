import { fmtCurrency } from "./calculations";
import type { TakeHomeFlowInput } from "./cashFlowModel";

export type TithingBasis = "gross" | "net";

export interface TithingSettings {
  enabled: boolean;
  /** Target percentage of chosen income basis */
  ratePct: number;
  /** Gross = traditional first-fruits; net = take-home basis */
  basis: TithingBasis;
  /** When true, monthly tithe syncs from rate × basis */
  autoCalculate: boolean;
}

export const DEFAULT_TITHING_SETTINGS: TithingSettings = {
  enabled: false,
  ratePct: 10,
  basis: "gross",
  autoCalculate: true,
};

export const TITHE_RATE_PRESETS = [5, 8, 10, 12] as const;

export const TITHING_VERSES = [
  {
    ref: "Malachi 3:10",
    text: "Bring the whole tithe into the storehouse… Test me in this, says the Lord.",
  },
  {
    ref: "2 Corinthians 9:7",
    text: "Each of you should give what you have decided in your heart to give, not reluctantly.",
  },
  {
    ref: "Proverbs 3:9",
    text: "Honor the Lord with your wealth, with the firstfruits of all your crops.",
  },
] as const;

export function calcMonthlyTitheAmount(
  settings: TithingSettings,
  grossMonthly: number,
  netMonthly: number,
  manualAmount?: number,
): number {
  if (!settings.enabled) return 0;
  if (!settings.autoCalculate && manualAmount != null) return Math.max(0, manualAmount);
  const basisAmount = settings.basis === "gross" ? grossMonthly : netMonthly;
  return Math.round((basisAmount * settings.ratePct) / 100);
}

export function calcTithingProgress(
  actualMonthly: number,
  targetMonthly: number,
): { pct: number; onTarget: boolean; delta: number } {
  if (targetMonthly <= 0) {
    return { pct: actualMonthly > 0 ? 100 : 0, onTarget: true, delta: 0 };
  }
  const pct = Math.min(100, Math.round((actualMonthly / targetMonthly) * 100));
  return {
    pct,
    onTarget: actualMonthly >= targetMonthly - 1,
    delta: targetMonthly - actualMonthly,
  };
}

export function tithingSummary(
  settings: TithingSettings,
  takeHome: TakeHomeFlowInput,
  monthlyTithe: number,
  monthlySurplusAfterAll: number,
) {
  const grossMonthly = takeHome.grossSalary / 12;
  const netMonthly = takeHome.netTakeHome / 12;
  const target = calcMonthlyTitheAmount(settings, grossMonthly, netMonthly);
  const progress = calcTithingProgress(monthlyTithe, target);
  const basisLabel = settings.basis === "gross" ? "gross income" : "net take-home";
  const annualGiving = monthlyTithe * 12;

  let encouragement: string;
  if (!settings.enabled) {
    encouragement = "Turn on tithing to model giving alongside your budget.";
  } else if (progress.onTarget) {
    encouragement = `You're planning ${fmtCurrency(monthlyTithe)}/mo (${settings.ratePct}% of ${basisLabel}) — ${fmtCurrency(annualGiving)}/yr toward your church and community.`;
  } else if (monthlyTithe > 0) {
    encouragement = `You're giving ${fmtCurrency(monthlyTithe)}/mo — ${fmtCurrency(Math.max(0, progress.delta))} below your ${settings.ratePct}% target. Every step counts.`;
  } else {
    encouragement = `Set a tithe amount to see how ${settings.ratePct}% of ${basisLabel} fits your cash flow.`;
  }

  return {
    grossMonthly,
    netMonthly,
    targetMonthly: target,
    progress,
    annualGiving,
    encouragement,
    surplusAfterTithe: monthlySurplusAfterAll,
  };
}

export function verseForMonth(): (typeof TITHING_VERSES)[number] {
  return TITHING_VERSES[new Date().getMonth() % TITHING_VERSES.length];
}
