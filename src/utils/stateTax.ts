import { Bracket } from '../data/taxBrackets';
import {
  ZERO_TAX_STATES,
  FLAT_RATE_STATES,
  BRACKET_STATES,
} from '../data/stateTaxRates';

function applyBrackets(income: number, brackets: Bracket[]): number {
  let tax = 0;
  let prev = 0;
  for (const { limit, rate } of brackets) {
    if (income <= prev) break;
    const taxable = Math.min(income, limit) - prev;
    tax += taxable * rate;
    prev = limit;
    if (limit === Infinity) break;
  }
  return tax;
}

/**
 * Calculates state income tax for all 50 US states and Washington DC.
 *
 * Zero-income-tax states (AK, FL, NH, NV, SD, TN, TX, WA, WY) return 0.
 * States with flat rates apply a single percentage to the full taxable income.
 * Remaining states apply marginal bracket logic.
 * States not in the data set fall back to a 5% conservative estimate.
 *
 * @param taxableIncome - Income subject to state tax (after traditional 401k deduction), in dollars
 * @param state - Two-letter state code (e.g. 'CA', 'TX', 'NY')
 * @returns State income tax owed, in dollars
 * @example
 *   calcStateTax(70500, 'CA')  // ~3209 (marginal brackets)
 *   calcStateTax(100000, 'TX') // 0 (no income tax)
 *   calcStateTax(100000, 'IL') // 4950 (flat 4.95%)
 */
export function calcStateTax(taxableIncome: number, state: string): number {
  const income = Math.max(0, taxableIncome);

  if (ZERO_TAX_STATES.has(state)) return 0;

  const flatRate = FLAT_RATE_STATES[state];
  if (flatRate !== undefined) return income * flatRate;

  const brackets = BRACKET_STATES[state];
  if (brackets) return applyBrackets(income, brackets);

  // Conservative fallback for any state not yet in the data set
  return income * 0.05;
}
