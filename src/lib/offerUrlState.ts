import type { CompFocus, UserPreferences, WorkStyle } from "./offerScoring";

export interface OfferInputsSnapshot {
  label: string;
  company: string;
  state: string;
  city: string;
  baseSalary: number;
  bonus: number;
  equity: number;
  retirementRate: number;
  commuteCost: number;
  commuteHrsWeek: number;
  workStyle: WorkStyle;
}

export interface OfferComparisonSnapshot {
  current: OfferInputsSnapshot;
  newOffer: OfferInputsSnapshot;
  prefs: UserPreferences;
}

const DEFAULT_CURRENT: OfferInputsSnapshot = {
  label: "Current Role",
  company: "Acme Corp",
  state: "CA",
  city: "San Francisco, CA",
  baseSalary: 185000,
  bonus: 20000,
  equity: 60000,
  retirementRate: 6,
  commuteCost: 180,
  commuteHrsWeek: 8,
  workStyle: "hybrid",
};

const DEFAULT_NEW: OfferInputsSnapshot = {
  label: "New Offer",
  company: "Startup Co",
  state: "WA",
  city: "Seattle, WA",
  baseSalary: 210000,
  bonus: 25000,
  equity: 80000,
  retirementRate: 6,
  commuteCost: 120,
  commuteHrsWeek: 5,
  workStyle: "remote",
};

export const DEFAULT_OFFER_COMPARISON: OfferComparisonSnapshot = {
  current: DEFAULT_CURRENT,
  newOffer: DEFAULT_NEW,
  prefs: {
    compFocus: "balanced",
    workPreference: "hybrid",
    commuteImportance: 50,
    household: "single",
    financialStability: 50,
  },
};

function isWorkStyle(v: unknown): v is WorkStyle {
  return v === "remote" || v === "hybrid" || v === "in_office";
}

function isCompFocus(v: unknown): v is CompFocus {
  return v === "cash_now" || v === "balanced" || v === "long_term";
}

function mergeOffer(base: OfferInputsSnapshot, patch: unknown): OfferInputsSnapshot {
  if (!patch || typeof patch !== "object") return base;
  const p = patch as Partial<OfferInputsSnapshot>;
  return {
    label: typeof p.label === "string" ? p.label : base.label,
    company: typeof p.company === "string" ? p.company : base.company,
    state: typeof p.state === "string" && /^[A-Z]{2}$/.test(p.state) ? p.state : base.state,
    city: typeof p.city === "string" ? p.city : base.city,
    baseSalary:
      typeof p.baseSalary === "number" && p.baseSalary >= 0 && p.baseSalary <= 5_000_000
        ? p.baseSalary
        : base.baseSalary,
    bonus: typeof p.bonus === "number" && p.bonus >= 0 ? p.bonus : base.bonus,
    equity: typeof p.equity === "number" && p.equity >= 0 ? p.equity : base.equity,
    retirementRate:
      typeof p.retirementRate === "number" && p.retirementRate >= 0 && p.retirementRate <= 23
        ? p.retirementRate
        : base.retirementRate,
    commuteCost: typeof p.commuteCost === "number" && p.commuteCost >= 0 ? p.commuteCost : base.commuteCost,
    commuteHrsWeek:
      typeof p.commuteHrsWeek === "number" && p.commuteHrsWeek >= 0 ? p.commuteHrsWeek : base.commuteHrsWeek,
    workStyle: isWorkStyle(p.workStyle) ? p.workStyle : base.workStyle,
  };
}

function mergePrefs(base: UserPreferences, patch: unknown): UserPreferences {
  if (!patch || typeof patch !== "object") return base;
  const p = patch as Partial<UserPreferences>;
  return {
    compFocus: isCompFocus(p.compFocus) ? p.compFocus : base.compFocus,
    workPreference: isWorkStyle(p.workPreference) ? p.workPreference : base.workPreference,
    commuteImportance:
      typeof p.commuteImportance === "number"
        ? Math.max(0, Math.min(100, p.commuteImportance))
        : base.commuteImportance,
    household: p.household === "couple" ? "couple" : base.household,
    financialStability:
      typeof p.financialStability === "number"
        ? Math.max(0, Math.min(100, p.financialStability))
        : base.financialStability,
  };
}

export function encodeOfferComparisonForUrl(snapshot: OfferComparisonSnapshot): string | undefined {
  const differsFromDefault =
    JSON.stringify(snapshot.current) !== JSON.stringify(DEFAULT_CURRENT) ||
    JSON.stringify(snapshot.newOffer) !== JSON.stringify(DEFAULT_NEW) ||
    JSON.stringify(snapshot.prefs) !== JSON.stringify(DEFAULT_OFFER_COMPARISON.prefs);

  if (!differsFromDefault) return undefined;

  const compact = {
    c: snapshot.current,
    n: snapshot.newOffer,
    p: snapshot.prefs,
  };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeOfferComparisonFromUrl(raw: string | null): Partial<OfferComparisonSnapshot> | null {
  if (!raw) return null;
  try {
    const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
    const json = decodeURIComponent(escape(atob(padded.replace(/-/g, "+").replace(/_/g, "/"))));
    const parsed = JSON.parse(json) as { c?: unknown; n?: unknown; p?: unknown };
    return {
      current: parsed.c ? mergeOffer(DEFAULT_CURRENT, parsed.c) : undefined,
      newOffer: parsed.n ? mergeOffer(DEFAULT_NEW, parsed.n) : undefined,
      prefs: parsed.p ? mergePrefs(DEFAULT_OFFER_COMPARISON.prefs, parsed.p) : undefined,
    };
  } catch {
    return null;
  }
}

export function mergeOfferComparison(
  base: OfferComparisonSnapshot,
  patch: Partial<OfferComparisonSnapshot> | null | undefined,
): OfferComparisonSnapshot {
  if (!patch) return base;
  return {
    current: patch.current ? mergeOffer(base.current, patch.current) : base.current,
    newOffer: patch.newOffer ? mergeOffer(base.newOffer, patch.newOffer) : base.newOffer,
    prefs: patch.prefs ? mergePrefs(base.prefs, patch.prefs) : base.prefs,
  };
}
