import { describe, it, expect } from 'vitest';
import { calcStateTax } from '../src/utils/stateTax';

describe('calcStateTax — zero-tax states', () => {
  const zeroTaxStates = ['TX', 'FL', 'WA', 'NV', 'WY', 'SD', 'AK', 'TN', 'NH'];

  it.each(zeroTaxStates)(
    '%s has no state income tax',
    (state) => {
      expect(calcStateTax(100000, state)).toBe(0);
    }
  );

  it('returns 0 for zero income in a zero-tax state', () => {
    expect(calcStateTax(0, 'TX')).toBe(0);
  });
});

describe('calcStateTax — flat-rate states', () => {
  it('IL: 4.95% flat on $100,000', () => {
    expect(calcStateTax(100000, 'IL')).toBeCloseTo(4950, 0);
  });

  it('PA: 3.07% flat on $80,000', () => {
    expect(calcStateTax(80000, 'PA')).toBeCloseTo(2456, 0);
  });

  it('MA: 5% flat on $150,000', () => {
    expect(calcStateTax(150000, 'MA')).toBeCloseTo(7500, 0);
  });
});

describe('calcStateTax — CA (marginal brackets)', () => {
  it('taxes $70,500 (post-401k income) correctly', () => {
    // Expected from 2024 CA brackets (applied in calcFullBreakdown test too):
    // 1%  on 0–10,412         = 104.12
    // 2%  on 10,412–24,684    = 285.44
    // 4%  on 24,684–38,959    = 571.00
    // 6%  on 38,959–54,081    = 907.32
    // 8%  on 54,081–68,350    = 1,141.52
    // 9.3% on 68,350–70,500   = 199.95
    // total ≈ 3,209
    expect(Math.round(calcStateTax(70500, 'CA'))).toBe(3209);
  });

  it('returns 0 for zero income in CA', () => {
    expect(calcStateTax(0, 'CA')).toBe(0);
  });

  it('taxes $200,000 CA income above the 9.3% and into 10.3% bracket', () => {
    const tax = calcStateTax(200000, 'CA');
    expect(tax).toBeGreaterThan(14000);
    expect(tax).toBeLessThan(22000);
  });
});

describe('calcStateTax — NY (marginal brackets)', () => {
  it('taxes $100,000 NY income correctly', () => {
    // 4%    on 0–17,150       = 686.00
    // 4.5%  on 17,150–23,600  = 290.25
    // 5.25% on 23,600–27,900  = 225.75
    // 5.85% on 27,900–100,000 = 4,217.85
    // total ≈ 5,420
    expect(Math.round(calcStateTax(100000, 'NY'))).toBe(5420);
  });

  it('NY tax is higher than TX at the same income', () => {
    expect(calcStateTax(100000, 'NY')).toBeGreaterThan(calcStateTax(100000, 'TX'));
  });
});

describe('calcStateTax — negative and edge inputs', () => {
  it('clamps negative taxable income to 0', () => {
    expect(calcStateTax(-10000, 'CA')).toBe(0);
    expect(calcStateTax(-10000, 'NY')).toBe(0);
  });

  it('handles unknown state with a conservative 5% fallback', () => {
    expect(calcStateTax(100000, 'XX')).toBeCloseTo(5000, 0);
  });
});
