import { describe, it, expect } from 'vitest';
import { k401MaxRatePct, k401AmountFromRate } from '../src/lib/contributionLimits';
import { IRS_401K_ELECTIVE_DEFERRAL_2026 } from '../src/lib/contributionLimits';

describe('k401MaxRatePct', () => {
  it('caps slider range at IRS limit relative to salary', () => {
    expect(k401MaxRatePct(300000, IRS_401K_ELECTIVE_DEFERRAL_2026)).toBeCloseTo(8.17, 1);
  });

  it('allows up to 100% when salary is below IRS max', () => {
    expect(k401MaxRatePct(20000, IRS_401K_ELECTIVE_DEFERRAL_2026)).toBe(100);
  });

  it('amount from max rate equals IRS cap on high salaries', () => {
    const gross = 300000;
    const maxRate = k401MaxRatePct(gross, IRS_401K_ELECTIVE_DEFERRAL_2026);
    expect(k401AmountFromRate(gross, maxRate, IRS_401K_ELECTIVE_DEFERRAL_2026)).toBe(
      IRS_401K_ELECTIVE_DEFERRAL_2026,
    );
  });
});
