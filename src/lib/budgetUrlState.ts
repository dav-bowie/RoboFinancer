import type { CashFlowExpenses } from "./cashFlowModel";
import { DEFAULT_CASH_FLOW_EXPENSES } from "./cashFlowModel";
import type { BalanceSheetState } from "./balanceSheetModel";
import { DEFAULT_BALANCE_SHEET } from "./balanceSheetModel";

export interface TakeHomeUrlSettings {
  k401Type: "traditional" | "roth";
  hsaAmount: number;
  rothIRA: number;
  employerMatch: number;
  age50Plus: boolean;
  age55Plus: boolean;
  hsaCoverage: "self" | "family";
}

export interface BudgetUrlSnapshot {
  cashFlowExpenses: CashFlowExpenses;
  balanceSheet: BalanceSheetState;
  takeHomeSettings?: TakeHomeUrlSettings;
}

function encode(obj: unknown): string | undefined {
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
    const json = decodeURIComponent(escape(atob(padded.replace(/-/g, "+").replace(/_/g, "/"))));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function encodeBudgetSnapshot(snapshot: BudgetUrlSnapshot): string | undefined {
  const differs =
    JSON.stringify(snapshot.cashFlowExpenses) !== JSON.stringify(DEFAULT_CASH_FLOW_EXPENSES) ||
    JSON.stringify(snapshot.balanceSheet) !== JSON.stringify(DEFAULT_BALANCE_SHEET) ||
    snapshot.takeHomeSettings != null;
  if (!differs) return undefined;
  return encode({ e: snapshot.cashFlowExpenses, b: snapshot.balanceSheet, t: snapshot.takeHomeSettings });
}

export function decodeBudgetSnapshot(raw: string | null): Partial<BudgetUrlSnapshot> | null {
  const parsed = decode<{ e?: CashFlowExpenses; b?: BalanceSheetState; t?: TakeHomeUrlSettings }>(raw);
  if (!parsed) return null;
  return {
    cashFlowExpenses: parsed.e,
    balanceSheet: parsed.b,
    takeHomeSettings: parsed.t,
  };
}
