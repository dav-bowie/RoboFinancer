import { fmtCurrency } from "../../lib/calculations";
import {
  BALANCE_SHEET_LABELS,
  calcBalanceSheetTotals,
  type BalanceSheetState,
  updateBalanceSheetField,
} from "../../lib/balanceSheetModel";
import { BudgetLineItemEditor } from "./BudgetLineItemEditor";

interface Props {
  sheet: BalanceSheetState;
  onChange: (sheet: BalanceSheetState) => void;
  /** Sync retirement balances from take-home tab (optional) */
  takeHomeRetirement?: {
    k401Balance?: number;
    rothIRABalance?: number;
    hsaBalance?: number;
  };
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
        <span className="text-xs tracking-widest uppercase text-muted-foreground">{title}</span>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  );
}

export function BalanceSheetPanel({ sheet, onChange, takeHomeRetirement }: Props) {
  const totals = calcBalanceSheetTotals(sheet);

  const sections: Array<{
    key: keyof typeof BALANCE_SHEET_LABELS;
    title: string;
  }> = [
    { key: "nonRetirement", title: "Non-Retirement Accounts" },
    { key: "retirement", title: "Retirement Accounts" },
    { key: "assets", title: "Personal Assets" },
    { key: "liabilities", title: "Liabilities" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Assets", value: totals.totalAssets, color: "text-foreground" },
          { label: "Total Liabilities", value: totals.liabilitiesTotal, color: "text-red-400" },
          { label: "Net Worth", value: totals.netWorth, color: totals.netWorth >= 0 ? "text-emerald-400" : "text-red-400" },
          { label: "Retirement", value: totals.retirementTotal, color: "text-indigo-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
            <div className={`font-mono text-base ${color}`}>{fmtCurrency(value)}</div>
          </div>
        ))}
      </div>

      {(takeHomeRetirement?.k401Balance != null ||
        takeHomeRetirement?.rothIRABalance != null ||
        takeHomeRetirement?.hsaBalance != null) && (
        <div className="rounded border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          Retirement account balances can reflect your Take-Home contribution amounts. Edit values below for full
          balance sheet totals.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map(({ key, title }) => (
          <Section key={key} title={title}>
            {(Object.keys(BALANCE_SHEET_LABELS[key]) as Array<keyof (typeof BALANCE_SHEET_LABELS)[typeof key]>).map(
              (field) => (
                <BudgetLineItemEditor
                  key={String(field)}
                  label={BALANCE_SHEET_LABELS[key][field]}
                  value={sheet[key][field as keyof BalanceSheetState[typeof key]] as number}
                  onChange={(value) => onChange(updateBalanceSheetField(sheet, key, field, value))}
                />
              ),
            )}
          </Section>
        ))}
      </div>
    </div>
  );
}
