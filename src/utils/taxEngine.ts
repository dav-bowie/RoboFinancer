import { calcFederalTax } from './federalTax';
import { calcStateTax } from './stateTax';
import {
  STANDARD_DEDUCTION_2024,
  SS_WAGE_BASE_2024,
  SS_RATE,
  MEDICARE_RATE,
  CA_SDI_RATE,
} from '../data/taxBrackets';

export interface TaxInputs {
  gross: number;
  filingStatus: 'single' | 'married';
  state: string;
  /** Pre-tax 401k contribution in dollars. Reduces federal and state taxable income. */
  traditional401k: number;
  /** After-tax 401k contribution in dollars. Does NOT reduce taxable income. */
  roth401k: number;
}

export interface TaxBreakdown {
  gross: number;
  traditional401k: number;
  roth401k: number;
  federalTaxableIncome: number;
  stateTaxableIncome: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  sdi: number;
  netTakeHome: number;
}

/**
 * Orchestrates all payroll deductions to compute a full annual tax breakdown.
 *
 * Deduction order:
 *   1. Traditional 401k reduces federal and state taxable income
 *   2. Standard deduction reduces federal taxable income only
 *   3. Federal income tax via 2024 marginal brackets
 *   4. State income tax (all 50 states + DC)
 *   5. Social Security: 6.2% up to the $168,600 wage base
 *   6. Medicare: 1.45% flat
 *   7. CA SDI: 1.1% on gross (California only, no wage cap as of 2024)
 *
 * Roth 401k contributions reduce net pay but do not reduce taxable income.
 *
 * @param inputs - Gross salary, filing status, state, and retirement contributions
 * @returns Full breakdown including each deduction and net take-home
 * @example
 *   calcFullBreakdown({
 *     gross: 95000,
 *     filingStatus: 'single',
 *     state: 'CA',
 *     traditional401k: 24500,
 *     roth401k: 0,
 *   })
 *   // federalTax: ~7351, stateTax: ~3209, netTakeHome: ~51627
 */
export function calcFullBreakdown(inputs: TaxInputs): TaxBreakdown {
  const { gross, filingStatus, state, traditional401k, roth401k } = inputs;

  const stdDeduction = STANDARD_DEDUCTION_2024[filingStatus];
  const federalTaxableIncome = Math.max(0, gross - stdDeduction - traditional401k);
  const stateTaxableIncome = Math.max(0, gross - traditional401k);

  const federalTax = calcFederalTax(federalTaxableIncome, filingStatus);
  const stateTax = calcStateTax(stateTaxableIncome, state);

  const socialSecurity = Math.min(gross, SS_WAGE_BASE_2024) * SS_RATE;
  const medicare = gross * MEDICARE_RATE;
  const sdi = state === 'CA' ? gross * CA_SDI_RATE : 0;

  const totalDeductions =
    federalTax + stateTax + socialSecurity + medicare + sdi + traditional401k + roth401k;
  const netTakeHome = gross - totalDeductions;

  return {
    gross,
    traditional401k,
    roth401k,
    federalTaxableIncome,
    stateTaxableIncome,
    federalTax,
    stateTax,
    socialSecurity,
    medicare,
    sdi,
    netTakeHome,
  };
}
