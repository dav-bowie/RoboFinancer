import { describe, it, expect } from 'vitest';
import { calcFullBreakdown } from '../src/utils/taxEngine';

// Reference scenario from SPEC:
// $95k gross, CA, single, $24,500 traditional 401k, $0 roth 401k
//
// Manual verification:
//   federalTaxableIncome = 95,000 − 14,600 (std deduction) − 24,500 = 55,900
//   stateTaxableIncome   = 95,000 − 24,500 = 70,500
//
//   Federal tax on 55,900 (single 2024):
//     10% × 11,600         =  1,160.00
//     12% × 35,550         =  4,266.00
//     22% × 8,750          =  1,925.00
//     total                =  7,351.00
//
//   CA state tax on 70,500:
//     1%    × 10,412       =    104.12
//     2%    × 14,272       =    285.44
//     4%    × 14,275       =    571.00
//     6%    × 15,122       =    907.32
//     8%    × 14,269       =  1,141.52
//     9.3%  × 2,150        =    199.95
//     total                =  3,209.35
//
//   Social Security: 95,000 × 6.2% = 5,890.00
//   Medicare:        95,000 × 1.45% = 1,377.50
//   CA SDI:          95,000 × 1.1%  = 1,045.00
//
//   Net = 95,000 − 7,351 − 3,209.35 − 5,890 − 1,377.50 − 24,500 − 1,045
//       = 51,627.15

const SPEC_SCENARIO = {
  gross: 95000,
  filingStatus: 'single' as const,
  state: 'CA',
  traditional401k: 24500,
  roth401k: 0,
};

describe('calcFullBreakdown — SPEC reference scenario ($95k, CA, single)', () => {
  const result = calcFullBreakdown(SPEC_SCENARIO);

  it('passes through gross correctly', () => {
    expect(result.gross).toBe(95000);
  });

  it('passes through 401k contributions correctly', () => {
    expect(result.traditional401k).toBe(24500);
    expect(result.roth401k).toBe(0);
  });

  it('computes federal taxable income (gross − std deduction − trad 401k)', () => {
    expect(result.federalTaxableIncome).toBe(55900);
  });

  it('computes state taxable income (gross − trad 401k)', () => {
    expect(result.stateTaxableIncome).toBe(70500);
  });

  it('computes federal tax ≈ $7,351', () => {
    expect(Math.round(result.federalTax)).toBe(7351);
  });

  it('computes CA state tax ≈ $3,209', () => {
    expect(Math.round(result.stateTax)).toBe(3209);
  });

  it('computes Social Security = $5,890', () => {
    expect(result.socialSecurity).toBe(5890);
  });

  it('computes Medicare = $1,377.50', () => {
    expect(result.medicare).toBeCloseTo(1377.5, 1);
  });

  it('computes CA SDI = $1,045', () => {
    expect(result.sdi).toBeCloseTo(1045, 0);
  });

  it('computes net take-home ≈ $51,627', () => {
    expect(Math.round(result.netTakeHome)).toBe(51627);
  });
});

describe('calcFullBreakdown — zero-tax state (TX)', () => {
  it('SDI is 0 for TX', () => {
    const r = calcFullBreakdown({ ...SPEC_SCENARIO, state: 'TX' });
    expect(r.sdi).toBe(0);
  });

  it('state tax is 0 for TX', () => {
    const r = calcFullBreakdown({ ...SPEC_SCENARIO, state: 'TX' });
    expect(r.stateTax).toBe(0);
  });

  it('TX net take-home is higher than CA net take-home at same gross', () => {
    const ca = calcFullBreakdown(SPEC_SCENARIO);
    const tx = calcFullBreakdown({ ...SPEC_SCENARIO, state: 'TX' });
    expect(tx.netTakeHome).toBeGreaterThan(ca.netTakeHome);
  });
});

describe('calcFullBreakdown — Roth 401k (does not reduce taxable income)', () => {
  it('Roth contribution reduces net take-home but not taxable income', () => {
    const traditional = calcFullBreakdown({ ...SPEC_SCENARIO });
    const roth = calcFullBreakdown({
      ...SPEC_SCENARIO,
      traditional401k: 0,
      roth401k: 24500,
    });

    // Federal taxable income is higher with Roth (no pre-tax deduction)
    expect(roth.federalTaxableIncome).toBeGreaterThan(traditional.federalTaxableIncome);

    // Roth filer pays more tax
    expect(roth.federalTax).toBeGreaterThan(traditional.federalTax);
  });
});

describe('calcFullBreakdown — Social Security wage base cap', () => {
  it('SS is capped at 6.2% × $168,600 for high earners', () => {
    const highEarner = calcFullBreakdown({
      gross: 400000,
      filingStatus: 'single',
      state: 'TX',
      traditional401k: 0,
      roth401k: 0,
    });
    expect(Math.round(highEarner.socialSecurity)).toBe(Math.round(168600 * 0.062));
  });
});

describe('calcFullBreakdown — married filing jointly', () => {
  it('married filer pays less federal tax than single at same gross', () => {
    const single = calcFullBreakdown(SPEC_SCENARIO);
    const married = calcFullBreakdown({ ...SPEC_SCENARIO, filingStatus: 'married' });
    expect(married.federalTax).toBeLessThan(single.federalTax);
    expect(married.netTakeHome).toBeGreaterThan(single.netTakeHome);
  });
});
