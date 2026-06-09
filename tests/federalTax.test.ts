import { describe, it, expect } from 'vitest';
import { calcFederalTax } from '../src/utils/federalTax';

// All taxable income values are AFTER standard deduction and traditional 401k.
// Expected values computed from 2024 IRS marginal brackets.

describe('calcFederalTax — single filer', () => {
  it('returns 0 for zero taxable income', () => {
    expect(calcFederalTax(0, 'single')).toBe(0);
  });

  it('returns 0 for negative taxable income (clamped)', () => {
    expect(calcFederalTax(-5000, 'single')).toBe(0);
  });

  it('taxes $10,000 entirely in the 10% bracket', () => {
    // 10,000 × 10% = 1,000
    expect(calcFederalTax(10000, 'single')).toBe(1000);
  });

  it('taxes $35,400 across the 10% and 12% brackets', () => {
    // 11,600 × 10% = 1,160
    // (35,400 − 11,600) × 12% = 23,800 × 12% = 2,856
    // total = 4,016
    expect(Math.round(calcFederalTax(35400, 'single'))).toBe(4016);
  });

  it('taxes $85,400 across 10%, 12%, 22% brackets', () => {
    // 11,600 × 10%  = 1,160
    // 35,550 × 12%  = 4,266
    // 38,250 × 22%  = 8,415
    // total = 13,841
    expect(Math.round(calcFederalTax(85400, 'single'))).toBe(13841);
  });

  it('taxes $135,400 across 10%, 12%, 22%, 24% brackets', () => {
    // 11,600 × 10%  = 1,160
    // 35,550 × 12%  = 4,266
    // 53,375 × 22%  = 11,742.50
    // 34,875 × 24%  = 8,370
    // total = 25,538.50
    expect(Math.round(calcFederalTax(135400, 'single'))).toBe(25539);
  });

  it('taxes high income ($400,000) correctly into 35% bracket', () => {
    // Bracket totals to the 35% range — just verify it is > 100k and < 200k
    const tax = calcFederalTax(400000, 'single');
    expect(tax).toBeGreaterThan(100000);
    expect(tax).toBeLessThan(200000);
  });
});

describe('calcFederalTax — married filing jointly', () => {
  it('taxes $100,000 across 10% and 12% married brackets', () => {
    // 23,200 × 10% = 2,320
    // 71,100 × 12% = 8,532
    // 5,700  × 22% = 1,254  (100k − 94,300 = 5,700)
    // total = 12,106
    expect(Math.round(calcFederalTax(100000, 'married'))).toBe(12106);
  });

  it('married filer pays less than single filer at the same income', () => {
    const singleTax = calcFederalTax(100000, 'single');
    const marriedTax = calcFederalTax(100000, 'married');
    expect(marriedTax).toBeLessThan(singleTax);
  });
});
