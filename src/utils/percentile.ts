export interface MarketData {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export type Verdict =
  | 'Above Market'
  | 'At Market'
  | 'Below Market'
  | 'Significantly Below Market';

/**
 * Interpolates a compensation's percentile position within a four-point market dataset.
 * Uses linear interpolation between adjacent percentile anchors.
 * Clamps the result to the range [0, 99].
 *
 * @param totalComp - Candidate's total annual compensation in dollars
 * @param marketData - Market benchmark object with p25, p50, p75, p90 values
 * @returns Integer percentile (0–99)
 * @example
 *   calcPercentile(250000, { p25: 200000, p50: 250000, p75: 310000, p90: 380000 })
 *   // 50
 */
export function calcPercentile(totalComp: number, marketData: MarketData): number {
  const { p25, p50, p75, p90 } = marketData;
  if (totalComp <= p25) {
    return Math.max(0, Math.round((totalComp / p25) * 25));
  }
  if (totalComp <= p50) {
    return Math.round(25 + ((totalComp - p25) / (p50 - p25)) * 25);
  }
  if (totalComp <= p75) {
    return Math.round(50 + ((totalComp - p50) / (p75 - p50)) * 25);
  }
  if (totalComp <= p90) {
    return Math.round(75 + ((totalComp - p75) / (p90 - p75)) * 15);
  }
  return Math.min(99, Math.round(90 + ((totalComp - p90) / p90) * 9));
}

/**
 * Maps a percentile score to a human-readable market position verdict.
 *
 * @param percentile - Integer percentile value (0–99)
 * @returns Market position label
 * @example
 *   getVerdict(80) // 'Above Market'
 *   getVerdict(50) // 'At Market'
 *   getVerdict(30) // 'Below Market'
 *   getVerdict(10) // 'Significantly Below Market'
 */
export function getVerdict(percentile: number): Verdict {
  if (percentile >= 75) return 'Above Market';
  if (percentile >= 50) return 'At Market';
  if (percentile >= 25) return 'Below Market';
  return 'Significantly Below Market';
}
