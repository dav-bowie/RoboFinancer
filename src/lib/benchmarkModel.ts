import type { MarketData } from "./calculations";

/** SOC / job-title keywords used to match H1B role_normalized rows */
export const ROLE_SEARCH_KEYWORDS: Record<string, string[]> = {
  "Software Engineer": ["software", "developer", "programming", "computer occupation", "applications"],
  "Product Manager": ["product manager", "product management", "product owner"],
  "Data Scientist": ["data scientist", "data science", "machine learning", "statistician"],
  Designer: ["designer", "user interface", "user experience", "graphic design"],
  "Engineering Manager": ["engineering manager", "computer and information systems managers", "manager"],
  "Data Engineer": ["data engineer", "database", "data warehouse", "business intelligence"],
  "DevOps / SRE": ["devops", "site reliability", "systems administrator", "network", "cloud"],
};

const MIN_LIVE_SAMPLE = 25;

export interface BenchmarkQueryContext {
  role: string;
  level: string;
  city: string;
  totalComp: number;
  staticBands: MarketData;
}

export interface BenchmarkResult {
  bands: MarketData;
  percentile: number;
  usingLiveData: boolean;
  sampleSize: number;
  methodology: string;
}

export function roleKeywords(role: string): string[] {
  return ROLE_SEARCH_KEYWORDS[role] ?? [role.toLowerCase()];
}

export function citySearchTerm(city: string): string | null {
  if (!city || city === "Remote") return null;
  return city.split(",")[0]?.trim().toLowerCase() ?? null;
}

export function stateFromCity(city: string): string {
  return city.split(",").pop()?.trim() ?? "";
}

/** Approximate base-salary window for a given total-comp level band */
export function levelBaseBand(staticBands: MarketData): { min: number; max: number } {
  return {
    min: Math.round(staticBands.p25 * 0.48),
    max: Math.round(staticBands.p90 * 0.88),
  };
}

export function percentileAt(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const weight = idx - lo;
  return Math.round(sorted[lo] * (1 - weight) + sorted[hi] * weight);
}

export function bandsFromSalaries(salaries: number[]): MarketData {
  const sorted = [...salaries].sort((a, b) => a - b);
  return {
    p25: percentileAt(sorted, 0.25),
    p50: percentileAt(sorted, 0.5),
    p75: percentileAt(sorted, 0.75),
    p90: percentileAt(sorted, 0.9),
  };
}

/** Empirical percentile rank (0–100) against a sorted salary sample */
export function percentileRank(value: number, sorted: number[]): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return value >= sorted[0] ? 50 : 0;
  const below = sorted.filter((s) => s < value).length;
  const equal = sorted.filter((s) => s === value).length;
  return Math.min(99, Math.max(1, Math.round(((below + equal * 0.5) / sorted.length) * 100)));
}

/** Scale H1B base wages to estimated total comp using static market anchor at p50 */
export function scaleBasesToTotalComp(baseSalaries: number[], staticTotalCompP50: number): number[] {
  const sorted = [...baseSalaries].sort((a, b) => a - b);
  const medianBase = percentileAt(sorted, 0.5);
  if (!medianBase) return baseSalaries;
  const ratio = staticTotalCompP50 / medianBase;
  return baseSalaries.map((b) => Math.round(b * ratio));
}

export function filterByLevelBand(baseSalaries: number[], staticBands: MarketData): number[] {
  const { min, max } = levelBaseBand(staticBands);
  return baseSalaries.filter((s) => s >= min && s <= max);
}

export function buildRoleOrFilter(keywords: string[]): string {
  return keywords.map((k) => `role_normalized.ilike.%${k.replace(/,/g, "")}%`).join(",");
}

export function resolveBenchmark(ctx: BenchmarkQueryContext, liveBaseSalaries: number[] | null): BenchmarkResult {
  const { totalComp, staticBands, role, level, city } = ctx;

  if (!liveBaseSalaries || liveBaseSalaries.length < MIN_LIVE_SAMPLE) {
    const percentile = interpolatePercentile(totalComp, staticBands);
    return {
      bands: staticBands,
      percentile,
      usingLiveData: false,
      sampleSize: liveBaseSalaries?.length ?? 0,
      methodology: `Estimated total comp for ${role} · ${level} · ${city} (Levels.fyi / market aggregates).`,
    };
  }

  const levelFiltered = filterByLevelBand(liveBaseSalaries, staticBands);
  const sample = levelFiltered.length >= MIN_LIVE_SAMPLE ? levelFiltered : liveBaseSalaries;
  const scaled = scaleBasesToTotalComp(sample, staticBands.p50);
  const bands = bandsFromSalaries(scaled);
  const sorted = [...scaled].sort((a, b) => a - b);
  const percentile = percentileRank(totalComp, sorted);

  const cityLabel = citySearchTerm(city) ? ` · ${city.split(",")[0]}` : "";
  const levelNote = levelFiltered.length >= MIN_LIVE_SAMPLE ? ` · ${level} band` : "";

  return {
    bands,
    percentile,
    usingLiveData: true,
    sampleSize: sample.length,
    methodology: `Total comp vs ${sample.length.toLocaleString()} H1B base wages in ${stateFromCity(city)}${cityLabel}${levelNote}, scaled to market total comp.`,
  };
}

/** Interpolate percentile from band anchors (static fallback) */
export function interpolatePercentile(totalComp: number, bands: MarketData): number {
  if (totalComp <= bands.p25) {
    return Math.max(1, Math.round((totalComp / bands.p25) * 25));
  }
  if (totalComp <= bands.p50) {
    const fraction = (totalComp - bands.p25) / (bands.p50 - bands.p25);
    return Math.round(25 + fraction * 25);
  }
  if (totalComp <= bands.p75) {
    const fraction = (totalComp - bands.p50) / (bands.p75 - bands.p50);
    return Math.round(50 + fraction * 25);
  }
  if (totalComp <= bands.p90) {
    const fraction = (totalComp - bands.p75) / (bands.p90 - bands.p75);
    return Math.round(75 + fraction * 15);
  }
  return Math.min(99, Math.round(90 + ((totalComp - bands.p90) / bands.p90) * 9));
}
