import { describe, it, expect } from "vitest";
import { calcMonthlyTitheAmount, calcTithingProgress, DEFAULT_TITHING_SETTINGS } from "../src/lib/tithingModel";
import { calcBudgetOutflows, normalizeCashFlowExpenses, DEFAULT_CASH_FLOW_EXPENSES } from "../src/lib/cashFlowModel";

describe("calcMonthlyTitheAmount", () => {
  it("returns 10% of gross by default", () => {
    const settings = { ...DEFAULT_TITHING_SETTINGS, enabled: true, ratePct: 10, basis: "gross" as const };
    expect(calcMonthlyTitheAmount(settings, 10000, 7000)).toBe(1000);
  });

  it("uses net basis when configured", () => {
    const settings = { ...DEFAULT_TITHING_SETTINGS, enabled: true, ratePct: 10, basis: "net" as const };
    expect(calcMonthlyTitheAmount(settings, 10000, 7000)).toBe(700);
  });

  it("returns zero when disabled", () => {
    expect(calcMonthlyTitheAmount(DEFAULT_TITHING_SETTINGS, 10000, 7000)).toBe(0);
  });
});

describe("calcTithingProgress", () => {
  it("marks on-target when within a dollar", () => {
    expect(calcTithingProgress(1000, 1000).onTarget).toBe(true);
    expect(calcTithingProgress(999, 1000).onTarget).toBe(true);
  });
});

describe("normalizeCashFlowExpenses", () => {
  it("adds giving defaults for legacy snapshots", () => {
    const legacy = {
      necessary: DEFAULT_CASH_FLOW_EXPENSES.necessary,
      lifestyle: DEFAULT_CASH_FLOW_EXPENSES.lifestyle,
      savingsRisk: DEFAULT_CASH_FLOW_EXPENSES.savingsRisk,
    };
    const normalized = normalizeCashFlowExpenses(legacy);
    expect(normalized.giving.tithing).toBe(0);
  });
});

describe("calcBudgetOutflows", () => {
  it("includes giving in monthly outflows", () => {
    const expenses = normalizeCashFlowExpenses({
      ...DEFAULT_CASH_FLOW_EXPENSES,
      giving: { tithing: 500, missions: 100, otherGiving: 0 },
    });
    const base = calcBudgetOutflows(DEFAULT_CASH_FLOW_EXPENSES);
    expect(calcBudgetOutflows(expenses)).toBe(base + 600);
  });
});
