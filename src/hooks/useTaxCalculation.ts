import { useState, useMemo } from 'react';
import { calcFullBreakdown, TaxInputs, TaxBreakdown } from '../utils/taxEngine';

const DEFAULT_INPUTS: TaxInputs = {
  gross: 150000,
  filingStatus: 'single',
  state: 'CA',
  traditional401k: 0,
  roth401k: 0,
};

export interface UseTaxCalculationReturn {
  inputs: TaxInputs;
  breakdown: TaxBreakdown;
  update: (patch: Partial<TaxInputs>) => void;
}

/**
 * Stateful hook wrapping calcFullBreakdown.
 * Re-computes the full breakdown whenever any input changes.
 *
 * @param overrides - Optional initial values to merge with defaults
 * @returns inputs, computed breakdown, and an update function
 */
export function useTaxCalculation(
  overrides: Partial<TaxInputs> = {}
): UseTaxCalculationReturn {
  const [inputs, setInputs] = useState<TaxInputs>({
    ...DEFAULT_INPUTS,
    ...overrides,
  });

  const breakdown = useMemo(() => calcFullBreakdown(inputs), [inputs]);

  function update(patch: Partial<TaxInputs>) {
    setInputs((prev) => ({ ...prev, ...patch }));
  }

  return { inputs, breakdown, update };
}
