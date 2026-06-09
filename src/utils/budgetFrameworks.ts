import { BUDGET_FRAMEWORKS, BudgetFramework } from '../data/budgetRules';

export type { BudgetFramework };
export { BUDGET_FRAMEWORKS };

export interface BudgetAllocation {
  needs: number;
  wants: number;
  savings: number;
}

/**
 * Returns the dollar allocation for each category given a framework and monthly income.
 *
 * @param frameworkId - Framework identifier (e.g. '50-30-20')
 * @param monthlyIncome - Net monthly take-home in dollars
 * @returns Allocated dollar amounts for needs, wants, and savings
 * @example
 *   allocateBudget('50-30-20', 8000)
 *   // { needs: 4000, wants: 2400, savings: 1600 }
 */
export function allocateBudget(
  frameworkId: string,
  monthlyIncome: number
): BudgetAllocation {
  const fw = BUDGET_FRAMEWORKS.find((f) => f.id === frameworkId) ?? BUDGET_FRAMEWORKS[0];
  return {
    needs: monthlyIncome * fw.needs,
    wants: monthlyIncome * fw.wants,
    savings: monthlyIncome * fw.savings,
  };
}

/**
 * Calculates the effective savings rate given actual spending.
 * Savings = income − needs spent − wants spent (floored at 0).
 *
 * @param monthlyIncome - Net monthly income in dollars
 * @param needsSpent - Actual monthly needs spending in dollars
 * @param wantsSpent - Actual monthly wants spending in dollars
 * @returns Savings rate as a decimal between 0 and 1
 * @example
 *   calcSavingsRate(8000, 3200, 2000) // 0.35
 */
export function calcSavingsRate(
  monthlyIncome: number,
  needsSpent: number,
  wantsSpent: number
): number {
  if (monthlyIncome <= 0) return 0;
  return Math.max(0, (monthlyIncome - needsSpent - wantsSpent) / monthlyIncome);
}
