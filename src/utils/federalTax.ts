import {
  Bracket,
  FEDERAL_BRACKETS_SINGLE_2024,
  FEDERAL_BRACKETS_MARRIED_2024,
} from '../data/taxBrackets';

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
 * Calculates 2024 federal income tax using marginal bracket logic.
 *
 * The caller is responsible for reducing taxable income by the standard
 * deduction and any traditional 401k contribution before calling this
 * function. Roth 401k contributions do not reduce taxable income and
 * should not be deducted before calling.
 *
 * @param taxableIncome - Income after standard deduction and traditional 401k, in dollars
 * @param filingStatus - 'single' or 'married' (married filing jointly)
 * @returns Federal income tax owed, in dollars
 * @example
 *   // $150k gross, single, no 401k: taxable = 150000 - 14600 = 135400
 *   calcFederalTax(135400, 'single') // ~25538
 */
export function calcFederalTax(
  taxableIncome: number,
  filingStatus: 'single' | 'married'
): number {
  const brackets =
    filingStatus === 'married'
      ? FEDERAL_BRACKETS_MARRIED_2024
      : FEDERAL_BRACKETS_SINGLE_2024;
  return applyBrackets(Math.max(0, taxableIncome), brackets);
}
