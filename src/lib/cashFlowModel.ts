import type { Edge, Node } from "@xyflow/react";
import { fmtCurrency } from "./calculations";

export interface NecessaryExpenses {
  housing: number;
  utilities: number;
  groceries: number;
  transport: number;
  subscriptions: number;
  insurance: number;
  debtPayments: number;
}

export interface LifestyleExpenses {
  dining: number;
  entertainment: number;
  hobbies: number;
  gifts: number;
  vacation: number;
  other: number;
}

export interface SavingsRiskExpenses {
  emergencySavings: number;
  investmentAccount: number;
  rothIRA: number;
  termLife: number;
  disabilityInsurance: number;
}

export interface CashFlowExpenses {
  necessary: NecessaryExpenses;
  lifestyle: LifestyleExpenses;
  savingsRisk: SavingsRiskExpenses;
}

export interface TakeHomeFlowInput {
  grossSalary: number;
  netTakeHome: number;
  k401Amount: number;
  hsaAmount: number;
  employerMatch: number;
  rothIRA: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  caSDI: number;
}

export interface CashFlowState {
  takeHome: TakeHomeFlowInput;
  expenses: CashFlowExpenses;
  /** Override monthly take-home for what-if; null = use calculator */
  customMonthlyTakeHome: number | null;
}

export type CashFlowNodeKind =
  | "source"
  | "deduction"
  | "hub"
  | "category"
  | "lineItem"
  | "result";

export interface CashFlowNodeData {
  label: string;
  monthly: number;
  annual: number;
  pctOfTakeHome?: number;
  kind: CashFlowNodeKind;
  category?: "necessary" | "lifestyle" | "savingsRisk";
  fieldKey?: string;
  editable?: boolean;
  tone?: "neutral" | "positive" | "negative" | "warning";
  [key: string]: unknown;
}

export const DEFAULT_CASH_FLOW_EXPENSES: CashFlowExpenses = {
  necessary: {
    housing: 750,
    utilities: 0,
    groceries: 100,
    transport: 50,
    subscriptions: 30,
    insurance: 0,
    debtPayments: 0,
  },
  lifestyle: {
    dining: 200,
    entertainment: 100,
    hobbies: 100,
    gifts: 0,
    vacation: 0,
    other: 100,
  },
  savingsRisk: {
    emergencySavings: 1250,
    investmentAccount: 750,
    rothIRA: 314,
    termLife: 0,
    disabilityInsurance: 0,
  },
};

/** Legacy 4-field shape for Take-Home PDF export */
export function toLegacyBudgetExpenses(expenses: CashFlowExpenses) {
  return {
    housing: expenses.necessary.housing,
    food: expenses.necessary.groceries,
    transport: expenses.necessary.transport,
    otherFixed: expenses.lifestyle.other,
  };
}

export function sumRecord(values: Record<string, number>): number {
  return Object.values(values).reduce((a, b) => a + b, 0);
}

/** Annual net pay minus post-tax Roth IRA — matches Take-Home "Spendable" display */
export function getSpendableAnnual(takeHome: TakeHomeFlowInput): number {
  return Math.max(0, takeHome.netTakeHome - takeHome.rothIRA);
}

export function getMonthlyTakeHome(state: CashFlowState): number {
  if (state.customMonthlyTakeHome != null) return state.customMonthlyTakeHome;
  return getSpendableAnnual(state.takeHome) / 12;
}

/** Spending outflows for surplus — Roth is already deducted from spendable income */
export function calcBudgetOutflows(expenses: CashFlowExpenses): number {
  const { necessary, lifestyle, savingsRisk } = calcSpendingTotals(expenses);
  return necessary + lifestyle + (savingsRisk - expenses.savingsRisk.rothIRA);
}

export function getMonthlyTaxes(takeHome: TakeHomeFlowInput): number {
  return (
    (takeHome.federalTax +
      takeHome.stateTax +
      takeHome.socialSecurity +
      takeHome.medicare +
      takeHome.caSDI) /
    12
  );
}

export function getMonthlyPreTax(takeHome: TakeHomeFlowInput) {
  return {
    k401: takeHome.k401Amount / 12,
    hsa: takeHome.hsaAmount / 12,
  };
}

export function calcSpendingTotals(expenses: CashFlowExpenses) {
  const necessary = sumRecord(expenses.necessary);
  const lifestyle = sumRecord(expenses.lifestyle);
  const savingsRisk = sumRecord(expenses.savingsRisk);
  return { necessary, lifestyle, savingsRisk, total: necessary + lifestyle + savingsRisk };
}

export function calcSurplus(state: CashFlowState): number {
  const monthlyTakeHome = getMonthlyTakeHome(state);
  return monthlyTakeHome - calcBudgetOutflows(state.expenses);
}

export function validateReconciliation(state: CashFlowState) {
  const surplus = calcSurplus(state);
  return {
    balanced: Math.abs(surplus) < 1,
    surplus,
    monthlyTakeHome: getMonthlyTakeHome(state),
    totalSpending: calcBudgetOutflows(state.expenses),
  };
}

const NECESSARY_LABELS: Record<keyof NecessaryExpenses, string> = {
  housing: "Housing",
  utilities: "Utilities",
  groceries: "Groceries",
  transport: "Transport",
  subscriptions: "Subscriptions",
  insurance: "Home/Auto Insurance",
  debtPayments: "Debt Payments",
};

const LIFESTYLE_LABELS: Record<keyof LifestyleExpenses, string> = {
  dining: "Dining Out",
  entertainment: "Entertainment",
  hobbies: "Hobbies",
  gifts: "Gifts",
  vacation: "Vacation",
  other: "Other",
};

const SAVINGS_RISK_LABELS: Record<keyof SavingsRiskExpenses, string> = {
  emergencySavings: "High-Yield Savings (Emergency)",
  investmentAccount: "Investment Account",
  rothIRA: "Roth IRA",
  termLife: "Term Life",
  disabilityInsurance: "Disability Insurance",
};

function pct(monthly: number, base: number) {
  return base > 0 ? Math.round((monthly / base) * 100) : 0;
}

function node(
  id: string,
  x: number,
  y: number,
  data: CashFlowNodeData,
): Node<CashFlowNodeData> {
  return { id, type: "cashFlow", position: { x, y }, data };
}

function edge(
  id: string,
  source: string,
  target: string,
  label?: string,
  strokeWidth = 1.5,
): Edge {
  return {
    id,
    source,
    target,
    label,
    style: { stroke: "#27272e", strokeWidth },
    labelStyle: { fill: "#a1a1aa", fontSize: 10 },
    labelBgStyle: { fill: "#101013", fillOpacity: 0.9 },
    animated: strokeWidth > 2,
  };
}

export function buildCashFlowGraph(state: CashFlowState): {
  nodes: Node<CashFlowNodeData>[];
  edges: Edge[];
} {
  const { takeHome, expenses } = state;
  const monthlyTakeHome = getMonthlyTakeHome(state);
  const preTax = getMonthlyPreTax(takeHome);
  const monthlyTaxes = getMonthlyTaxes(takeHome);
  const monthlyGross = takeHome.grossSalary / 12;
  const surplus = calcSurplus(state);

  const nodes: Node<CashFlowNodeData>[] = [];
  const edges: Edge[] = [];

  nodes.push(
    node("gross", 0, 0, {
      label: "Gross Income",
      monthly: monthlyGross,
      annual: takeHome.grossSalary,
      kind: "source",
      tone: "neutral",
    }),
  );

  const deductions: Array<{ id: string; label: string; monthly: number }> = [
    { id: "k401", label: "401(k) Pre-Tax", monthly: preTax.k401 },
    { id: "hsa", label: "HSA Pre-Tax", monthly: preTax.hsa },
    { id: "taxes", label: "Taxes & FICA", monthly: monthlyTaxes },
  ];

  deductions.forEach((d, i) => {
    if (d.monthly <= 0) return;
    nodes.push(
      node(d.id, 220, i * 72, {
        label: d.label,
        monthly: d.monthly,
        annual: d.monthly * 12,
        pctOfTakeHome: pct(d.monthly, monthlyTakeHome),
        kind: "deduction",
        tone: "negative",
        editable: false,
      }),
    );
    edges.push(
      edge(
        `e-gross-${d.id}`,
        "gross",
        d.id,
        fmtCurrency(d.monthly),
        Math.max(1.5, (d.monthly / monthlyGross) * 6),
      ),
    );
    edges.push(edge(`e-${d.id}-takehome`, d.id, "takehome"));
  });

  nodes.push(
    node("takehome", 480, 80, {
      label: "Monthly Take-Home",
      monthly: monthlyTakeHome,
      annual: monthlyTakeHome * 12,
      kind: "hub",
      tone: "positive",
    }),
  );

  if (deductions.every((d) => d.monthly <= 0)) {
    edges.push(edge("e-gross-takehome", "gross", "takehome", fmtCurrency(monthlyTakeHome), 3));
  }

  const categories: Array<{
    id: string;
    label: string;
    category: "necessary" | "lifestyle" | "savingsRisk";
    items: Record<string, number>;
    labels: Record<string, string>;
    y: number;
  }> = [
    {
      id: "necessary",
      label: "Necessary & Essential",
      category: "necessary",
      items: expenses.necessary,
      labels: NECESSARY_LABELS,
      y: 0,
    },
    {
      id: "lifestyle",
      label: "Lifestyle & Discretionary",
      category: "lifestyle",
      items: expenses.lifestyle,
      labels: LIFESTYLE_LABELS,
      y: 200,
    },
    {
      id: "savingsRisk",
      label: "Savings & Risk Management",
      category: "savingsRisk",
      items: expenses.savingsRisk,
      labels: SAVINGS_RISK_LABELS,
      y: 400,
    },
  ];

  categories.forEach((cat) => {
    const total = sumRecord(cat.items);
    nodes.push(
      node(cat.id, 760, cat.y, {
        label: cat.label,
        monthly: total,
        annual: total * 12,
        pctOfTakeHome: pct(total, monthlyTakeHome),
        kind: "category",
        category: cat.category,
        tone: cat.category === "savingsRisk" ? "positive" : "neutral",
      }),
    );
    edges.push(
      edge(
        `e-takehome-${cat.id}`,
        "takehome",
        cat.id,
        fmtCurrency(total),
        Math.max(1.5, monthlyTakeHome > 0 ? (total / monthlyTakeHome) * 5 : 1.5),
      ),
    );

    let itemY = cat.y - 20;
    (Object.keys(cat.items) as string[]).forEach((key) => {
      const monthly = cat.items[key as keyof typeof cat.items];
      if (monthly <= 0) return;
      const itemId = `${cat.id}-${key}`;
      nodes.push(
        node(itemId, 1020, itemY, {
          label: cat.labels[key],
          monthly,
          annual: monthly * 12,
          pctOfTakeHome: pct(monthly, monthlyTakeHome),
          kind: "lineItem",
          category: cat.category,
          fieldKey: key,
          editable: true,
          tone: "neutral",
        }),
      );
      edges.push(edge(`e-${cat.id}-${itemId}`, cat.id, itemId, fmtCurrency(monthly)));
      itemY += 56;
    });
  });

  nodes.push(
    node("surplus", 760, 560, {
      label: surplus >= 0 ? "Surplus" : "Shortage",
      monthly: Math.abs(surplus),
      annual: Math.abs(surplus) * 12,
      pctOfTakeHome: pct(Math.abs(surplus), monthlyTakeHome),
      kind: "result",
      tone: surplus >= 0 ? "positive" : "warning",
      editable: false,
    }),
  );
  edges.push(
    edge(
      "e-takehome-surplus",
      "takehome",
      "surplus",
      surplus >= 0 ? `+${fmtCurrency(surplus)}` : `−${fmtCurrency(Math.abs(surplus))}`,
      2.5,
    ),
  );

  return { nodes, edges };
}

export function updateExpenseField(
  expenses: CashFlowExpenses,
  category: "necessary" | "lifestyle" | "savingsRisk",
  fieldKey: string,
  value: number,
): CashFlowExpenses {
  const section = expenses[category] as Record<string, number>;
  if (!(fieldKey in section)) return expenses;
  return {
    ...expenses,
    [category]: { ...section, [fieldKey]: Math.max(0, value) },
  };
}

export const EXPENSE_FIELD_LABELS = {
  necessary: NECESSARY_LABELS,
  lifestyle: LIFESTYLE_LABELS,
  savingsRisk: SAVINGS_RISK_LABELS,
};
