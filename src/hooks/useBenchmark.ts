import { useMemo } from 'react';
import { getMarketData } from '../lib/calculations';
import { calcPercentile, getVerdict, MarketData, Verdict } from '../utils/percentile';

export interface BenchmarkResult {
  marketData: MarketData | null;
  percentile: number | null;
  verdict: Verdict | null;
}

/**
 * Derives market position for a given role, level, city, and total comp.
 * Returns null values when market data is unavailable for the combination.
 *
 * @param role - Job role (e.g. 'Software Engineer')
 * @param level - Seniority level (e.g. 'L5 / Senior')
 * @param city - City string matching CITIES constant (e.g. 'San Francisco, CA')
 * @param totalComp - Total annual compensation in dollars (base + bonus + equity)
 * @returns marketData, percentile (0–99), and verdict label
 */
export function useBenchmark(
  role: string,
  level: string,
  city: string,
  totalComp: number
): BenchmarkResult {
  const marketData = useMemo(
    () => getMarketData(role, level, city),
    [role, level, city]
  );

  const percentile = useMemo(
    () => (marketData ? calcPercentile(totalComp, marketData) : null),
    [totalComp, marketData]
  );

  const verdict = useMemo(
    () => (percentile !== null ? getVerdict(percentile) : null),
    [percentile]
  );

  return { marketData, percentile, verdict };
}
