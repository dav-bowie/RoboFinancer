import { describe, expect, it } from "vitest";
import {
  bandsFromSalaries,
  filterByLevelBand,
  interpolatePercentile,
  percentileRank,
  resolveBenchmark,
  scaleBasesToTotalComp,
} from "../src/lib/benchmarkModel";

describe("benchmarkModel", () => {
  const staticBands = { p25: 200000, p50: 250000, p75: 300000, p90: 350000 };

  it("computes percentile rank from sorted sample", () => {
    const sample = [100, 200, 300, 400, 500];
    expect(percentileRank(300, sample)).toBe(50);
    expect(percentileRank(500, sample)).toBeGreaterThan(80);
  });

  it("filters salaries to level band", () => {
    const bases = [80000, 150000, 220000, 280000, 400000];
    const filtered = filterByLevelBand(bases, staticBands);
    expect(filtered).toContain(220000);
    expect(filtered).not.toContain(80000);
  });

  it("scales base wages toward total comp anchor", () => {
    const scaled = scaleBasesToTotalComp([100000, 120000, 140000], 250000);
    expect(scaled[1]).toBeGreaterThan(120000);
  });

  it("builds bands from salary list", () => {
    const bands = bandsFromSalaries([100, 200, 300, 400, 500]);
    expect(bands.p50).toBe(300);
    expect(bands.p25).toBeLessThan(bands.p75);
  });

  it("falls back to static when live sample is too small", () => {
    const result = resolveBenchmark(
      { role: "Software Engineer", level: "L5 / Senior", city: "San Francisco, CA", totalComp: 260000, staticBands },
      [200000, 210000],
    );
    expect(result.usingLiveData).toBe(false);
    expect(result.percentile).toBeGreaterThan(40);
  });

  it("uses live data when sample is large enough", () => {
    const live = Array.from({ length: 40 }, (_, i) => 120000 + i * 3000);
    const result = resolveBenchmark(
      { role: "Software Engineer", level: "L5 / Senior", city: "San Francisco, CA", totalComp: 280000, staticBands },
      live,
    );
    expect(result.usingLiveData).toBe(true);
    expect(result.sampleSize).toBeGreaterThanOrEqual(25);
  });

  it("interpolates static percentile at median", () => {
    expect(interpolatePercentile(250000, staticBands)).toBe(50);
  });
});
