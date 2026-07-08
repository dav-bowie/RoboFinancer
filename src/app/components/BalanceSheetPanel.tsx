import { Wallet, Landmark, Car, CreditCard } from "lucide-react";
import { fmtCurrency } from "../../lib/calculations";
import {
  BALANCE_SHEET_LABELS,
  calcBalanceSheetTotals,
  type BalanceSheetState,
  updateBalanceSheetField,
} from "../../lib/balanceSheetModel";
import { BudgetLineItemEditor } from "./BudgetLineItemEditor";
import { BudgetPanel, HighlightBox, StatTile, type BudgetAccent } from "./ui/budget-ui";

interface Props {
  sheet: BalanceSheetState;
  onChange: (sheet: BalanceSheetState) => void;
  takeHomeRetirement?: {
    k401Balance?: number;
    rothIRABalance?: number;
    hsaBalance?: number;
  };
}

const SECTION_META: Record<
  keyof typeof BALANCE_SHEET_LABELS,
  { accent: BudgetAccent; icon: typeof Wallet; description: string }
> = {
  nonRetirement: {
    accent: "sky",
    icon: Wallet,
    description: "Cash, savings, brokerage, and other taxable accounts.",
  },
  retirement: {
    accent: "indigo",
    icon: Landmark,
    description: "401(k), Roth IRA, HSA, and other tax-advantaged balances.",
  },
  assets: {
    accent: "emerald",
    icon: Car,
    description: "Home equity, vehicles, and other personal assets.",
  },
  liabilities: {
    accent: "rose",
    icon: CreditCard,
    description: "Mortgages, student loans, credit cards, and other debt.",
  },
};

export function BalanceSheetPanel({ sheet, onChange, takeHomeRetirement }: Props) {
  const totals = calcBalanceSheetTotals(sheet);

  const sections: Array<{ key: keyof typeof BALANCE_SHEET_LABELS; title: string }> = [
    { key: "nonRetirement", title: "Non-Retirement Accounts" },
    { key: "retirement", title: "Retirement Accounts" },
    { key: "assets", title: "Personal Assets" },
    { key: "liabilities", title: "Liabilities" },
  ];

  return (
    <div className="space-y-5">
      <BudgetPanel
        accent="emerald"
        icon={Wallet}
        title="Net Worth Snapshot"
        description="Your full balance sheet at a glance — assets minus liabilities."
        stats={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatTile label="Total assets" value={fmtCurrency(totals.totalAssets)} accent="emerald" />
            <StatTile label="Liabilities" value={fmtCurrency(totals.liabilitiesTotal)} valueClassName="text-red-400" />
            <StatTile
              label="Net worth"
              value={fmtCurrency(totals.netWorth)}
              valueClassName={totals.netWorth >= 0 ? "text-emerald-400" : "text-red-400"}
            />
            <StatTile label="Retirement" value={fmtCurrency(totals.retirementTotal)} accent="indigo" />
          </div>
        }
      />

      {(takeHomeRetirement?.k401Balance != null ||
        takeHomeRetirement?.rothIRABalance != null ||
        takeHomeRetirement?.hsaBalance != null) && (
        <HighlightBox accent="indigo" kicker="Synced from Take-Home">
          Retirement balances can reflect your contribution settings. Edit below for your full picture.
        </HighlightBox>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {sections.map(({ key, title }) => {
          const meta = SECTION_META[key];
          const sectionTotal = Object.values(sheet[key]).reduce((a, b) => a + b, 0);
          return (
            <BudgetPanel
              key={key}
              accent={meta.accent}
              icon={meta.icon}
              title={title}
              description={meta.description}
              stats={
                <StatTile
                  label="Section total"
                  value={fmtCurrency(sectionTotal)}
                  accent={meta.accent}
                />
              }
            >
              <div className="space-y-2 pt-5">
                {(Object.keys(BALANCE_SHEET_LABELS[key]) as Array<keyof (typeof BALANCE_SHEET_LABELS)[typeof key]>).map(
                  (field) => (
                    <BudgetLineItemEditor
                      key={String(field)}
                      variant="row"
                      accent={meta.accent}
                      label={BALANCE_SHEET_LABELS[key][field]}
                      value={sheet[key][field as keyof BalanceSheetState[typeof key]] as number}
                      onChange={(value) => onChange(updateBalanceSheetField(sheet, key, field, value))}
                    />
                  ),
                )}
              </div>
            </BudgetPanel>
          );
        })}
      </div>
    </div>
  );
}
