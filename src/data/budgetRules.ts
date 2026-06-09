export interface BudgetFramework {
  id: string;
  label: string;
  needs: number;
  wants: number;
  savings: number;
  description: string;
}

export const BUDGET_FRAMEWORKS: BudgetFramework[] = [
  {
    id: '50-30-20',
    label: '50/30/20',
    needs: 0.50,
    wants: 0.30,
    savings: 0.20,
    description: 'Standard framework — balanced needs/wants/savings split',
  },
  {
    id: '60-20-20',
    label: '60/20/20',
    needs: 0.60,
    wants: 0.20,
    savings: 0.20,
    description: 'High-cost-of-living variant — more to needs, less discretionary',
  },
  {
    id: '60-30-10',
    label: '60/30/10',
    needs: 0.60,
    wants: 0.30,
    savings: 0.10,
    description: 'Minimum savings — suitable for early career or high-cost cities',
  },
];
