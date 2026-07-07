import { describe, it, expect } from 'vitest';
import {
  applyAllocationSuggestions,
  buildAllocationPlan,
  calcEmergencyFundTarget,
  DEFAULT_ALLOCATION_PREFERENCES,
} from '../src/lib/allocationModel';
import { DEFAULT_CASH_FLOW_EXPENSES } from '../src/lib/cashFlowModel';
import { DEFAULT_BALANCE_SHEET } from '../src/lib/balanceSheetModel';

describe('calcEmergencyFundTarget', () => {
  it('multiplies monthly essentials by months', () => {
    expect(calcEmergencyFundTarget(1010, 12)).toBe(12120);
  });
});

describe('applyAllocationSuggestions', () => {
  it('writes bucket recommendations into savings line items', () => {
    const plan = buildAllocationPlan(
      DEFAULT_CASH_FLOW_EXPENSES,
      DEFAULT_BALANCE_SHEET,
      {
        k401Amount: 12600,
        hsaAmount: 4150,
        rothIRA: 7000,
        grossSalary: 210000,
      },
      DEFAULT_ALLOCATION_PREFERENCES,
      8500,
    );

    const updated = applyAllocationSuggestions(DEFAULT_CASH_FLOW_EXPENSES, plan);
    const hys = plan.buckets.find((b) => b.id === 'highYieldSavings')!;
    const roth = plan.buckets.find((b) => b.id === 'rothIRA')!;
    const brokerage = plan.buckets.find((b) => b.id === 'brokerage')!;

    expect(updated.savingsRisk.emergencySavings).toBe(hys.recommendedMonthly);
    expect(updated.savingsRisk.rothIRA).toBe(roth.recommendedMonthly);
    expect(updated.savingsRisk.investmentAccount).toBe(brokerage.recommendedMonthly);
  });
});
