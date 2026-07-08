import { useState, useMemo, useEffect, type Dispatch, type SetStateAction } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Link2, Check } from "lucide-react";
import { toast } from "sonner";
import { fmtCurrency } from "../../lib/calculations";
import {
  calcSpendingTotals,
  calcSurplus,
  EXPENSE_FIELD_LABELS,
  getMonthlyTakeHome,
  updateExpenseField,
  type CashFlowExpenses,
  type CashFlowState,
  type TakeHomeFlowInput,
} from "../../lib/cashFlowModel";
import type { BalanceSheetState } from "../../lib/balanceSheetModel";
import { RangeSlider } from "./ui/range-slider";
import { CashFlowDiagram, FlowSummaryBar } from "./CashFlowDiagram";
import { BalanceSheetPanel } from "./BalanceSheetPanel";
import { BudgetLineItemEditor } from "./BudgetLineItemEditor";
import { AllocationBucketsVisual } from "./AllocationBucketsVisual";
import {
  applyAllocationSuggestions,
  buildAllocationPlan,
  DEFAULT_ALLOCATION_PREFERENCES,
  type AllocationPreferences,
} from "../../lib/allocationModel";

type BudgetSubView = "flow" | "allocate" | "framework" | "balance";

interface Props {
  takeHome: TakeHomeFlowInput;
  cashFlowExpenses: CashFlowExpenses;
  onCashFlowExpensesUpdate: Dispatch<SetStateAction<CashFlowExpenses>>;
  balanceSheet: BalanceSheetState;
  onBalanceSheetUpdate: (sheet: BalanceSheetState) => void;
  netTakeHome: number;
}

const SUB_VIEWS: { id: BudgetSubView; label: string }[] = [
  { id: "flow", label: "Flow Diagram" },
  { id: "allocate", label: "Bucket Allocation" },
  { id: "framework", label: "Budget Framework" },
  { id: "balance", label: "Balance Sheet" },
];

const FRAMEWORKS = [
  { id: "50-30-20", label: "50/30/20", needs: 0.5, wants: 0.3, savings: 0.2, name: "Classic balance", description: "Half for essentials, 30% for lifestyle, 20% for savings and debt payoff.", bestFor: "Most people — the default starting point" },
  { id: "60-30-10", label: "60/30/10", needs: 0.6, wants: 0.3, savings: 0.1, name: "High-cost city", description: "More room for rent and bills, still some fun money, lighter savings.", bestFor: "Expensive metros or tight budgets" },
  { id: "70-20-10", label: "70/20/10", needs: 0.7, wants: 0.2, savings: 0.1, name: "Survival mode", description: "Most income covers basics, minimal discretionary, small savings cushion.", bestFor: "Early career or recovering from debt" },
  { id: "40-30-30", label: "40/30/30", needs: 0.4, wants: 0.3, savings: 0.3, name: "Aggressive saver", description: "Lower fixed costs, same lifestyle budget, heavy savings rate.", bestFor: "FIRE goals or fast wealth building" },
];

const CATEGORY_COLORS = { needs: "#6366f1", wants: "#f59e0b", savings: "#10b981" } as const;
const EXPENSE_COLORS = { housing: "#818cf8", food: "#6366f1", transport: "#4f46e5", subscriptions: "#fbbf24", entertainment: "#f59e0b", other: "#d97706", savings: "#10b981", deficit: "#ef4444" } as const;

function FrameworkSplitBar({ needs, wants, savings }: { needs: number; wants: number; savings: number }) {
  return (
    <div className="flex w-full overflow-hidden rounded-full bg-muted border border-border h-2.5">
      <div style={{ width: `${needs * 100}%`, background: CATEGORY_COLORS.needs }} />
      <div style={{ width: `${wants * 100}%`, background: CATEGORY_COLORS.wants }} />
      <div style={{ width: `${savings * 100}%`, background: CATEGORY_COLORS.savings }} />
    </div>
  );
}

function FrameworkCard({ framework, selected, monthlyIncome, onSelect }: { framework: (typeof FRAMEWORKS)[number]; selected: boolean; monthlyIncome: number; onSelect: () => void }) {
  const segments = [
    { key: "needs", pct: framework.needs, label: "Needs", color: CATEGORY_COLORS.needs },
    { key: "wants", pct: framework.wants, label: "Wants", color: CATEGORY_COLORS.wants },
    { key: "savings", pct: framework.savings, label: "Savings", color: CATEGORY_COLORS.savings },
  ];
  return (
    <button type="button" onClick={onSelect} className={`w-full text-left rounded-lg border p-4 transition-all ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-secondary/50 hover:bg-secondary"}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-lg ${selected ? "text-primary" : "text-foreground"}`}>{framework.label}</span>
            <span className="text-xs text-muted-foreground">{framework.name}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{framework.description}</p>
        </div>
        {selected && <div className="shrink-0 rounded-full bg-primary/15 p-1"><Check size={14} className="text-primary" /></div>}
      </div>
      <FrameworkSplitBar needs={framework.needs} wants={framework.wants} savings={framework.savings} />
      <div className="grid grid-cols-3 gap-2 mt-3">
        {segments.map(({ key, pct, label, color }) => (
          <div key={key} className="rounded border border-border/60 bg-background/40 px-2 py-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
            </div>
            <div className="font-mono text-sm text-foreground">{Math.round(pct * 100)}%</div>
            {monthlyIncome > 0 && <div className="text-[10px] text-muted-foreground font-mono">{fmtCurrency(monthlyIncome * pct)}/mo</div>}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2.5">Best for: {framework.bestFor}</p>
    </button>
  );
}

function ExpenseSectionEditor({
  title,
  category,
  expenses,
  onUpdate,
}: {
  title: string;
  category: "necessary" | "lifestyle" | "savingsRisk";
  expenses: CashFlowExpenses;
  onUpdate: (expenses: CashFlowExpenses) => void;
}) {
  const items = expenses[category];
  const labels = EXPENSE_FIELD_LABELS[category];
  return (
    <section className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
      <h3 className="text-xs tracking-widest uppercase text-muted-foreground">{title}</h3>
      <div className="space-y-2">
        {(Object.keys(labels) as Array<keyof typeof labels>).map((key) => (
          <BudgetLineItemEditor
            key={String(key)}
            label={labels[key]}
            value={items[key as keyof typeof items]}
            onChange={(value) => onUpdate(updateExpenseField(expenses, category, String(key), value))}
          />
        ))}
      </div>
    </section>
  );
}

export function BudgetModule({
  takeHome,
  cashFlowExpenses,
  onCashFlowExpensesUpdate,
  balanceSheet,
  onBalanceSheetUpdate,
  netTakeHome,
}: Props) {
  const [subView, setSubView] = useState<BudgetSubView>("flow");
  const [frameworkId, setFrameworkId] = useState("50-30-20");
  const [customMonthlyTakeHome, setCustomMonthlyTakeHome] = useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [allocationPrefs, setAllocationPrefs] = useState<AllocationPreferences>(DEFAULT_ALLOCATION_PREFERENCES);
  const [allocationApplied, setAllocationApplied] = useState(false);

  const cashFlowState: CashFlowState = useMemo(
    () => ({ takeHome, expenses: cashFlowExpenses, customMonthlyTakeHome }),
    [takeHome, cashFlowExpenses, customMonthlyTakeHome],
  );

  useEffect(() => {
    const monthlyRoth = Math.round(takeHome.rothIRA / 12);
    onCashFlowExpensesUpdate((prev) => {
      if (prev.savingsRisk.rothIRA === monthlyRoth) return prev;
      return updateExpenseField(prev, "savingsRisk", "rothIRA", monthlyRoth);
    });
  }, [takeHome.rothIRA, onCashFlowExpensesUpdate]);

  const monthlyIncome = getMonthlyTakeHome(cashFlowState);
  const income = monthlyIncome * 12;
  const monthlyFromCalculator = Math.round(netTakeHome / 12);
  const isUsingCalculator = customMonthlyTakeHome === null && netTakeHome > 0;
  const spending = calcSpendingTotals(cashFlowExpenses);
  const surplus = calcSurplus(cashFlowState);

  const necessary = cashFlowExpenses.necessary;
  const lifestyleExp = cashFlowExpenses.lifestyle;
  const housingAmt = necessary.housing;
  const food = necessary.groceries;
  const transport = necessary.transport;
  const subscriptions = necessary.subscriptions;
  const entertainment = lifestyleExp.entertainment;
  const other = lifestyleExp.other;

  const framework = FRAMEWORKS.find((f) => f.id === frameworkId) || FRAMEWORKS[0];
  const allocated = { needs: monthlyIncome * framework.needs, wants: monthlyIncome * framework.wants, savings: monthlyIncome * framework.savings };
  const actualSpending = {
    needs: spending.necessary,
    wants: spending.lifestyle,
    savings: Math.max(0, monthlyIncome - spending.necessary - spending.lifestyle),
  };

  const chartData = [
    { category: "Needs", Allocated: Math.round(allocated.needs), Actual: Math.round(actualSpending.needs) },
    { category: "Wants", Allocated: Math.round(allocated.wants), Actual: Math.round(actualSpending.wants) },
    { category: "Savings", Allocated: Math.round(allocated.savings), Actual: Math.round(actualSpending.savings) },
  ];

  const pieChartData = [
    { name: "Housing", value: housingAmt, color: EXPENSE_COLORS.housing },
    { name: "Food & Groceries", value: food, color: EXPENSE_COLORS.food },
    { name: "Transport", value: transport, color: EXPENSE_COLORS.transport },
    { name: "Subscriptions", value: subscriptions, color: EXPENSE_COLORS.subscriptions },
    { name: "Entertainment", value: entertainment, color: EXPENSE_COLORS.entertainment },
    { name: "Other", value: other, color: EXPENSE_COLORS.other },
    ...(actualSpending.savings > 0 ? [{ name: "Savings", value: actualSpending.savings, color: EXPENSE_COLORS.savings }] : []),
  ].filter((d) => d.value > 0).map((d) => ({ ...d, pct: monthlyIncome > 0 ? Math.round((d.value / monthlyIncome) * 100) : 0 }));

  const selectedNode = selectedNodeId
    ? buildSelectedNodeMeta(selectedNodeId, cashFlowExpenses)
    : null;

  const sliderMin = 1500;
  const sliderMax = Math.max(25000, Math.round(monthlyFromCalculator * 1.75) || 15000);

  const allocationPlan = useMemo(
    () =>
      buildAllocationPlan(
        cashFlowExpenses,
        balanceSheet,
        takeHome,
        allocationPrefs,
        monthlyIncome,
      ),
    [cashFlowExpenses, balanceSheet, takeHome, allocationPrefs, monthlyIncome],
  );

  const handleApplyAllocation = () => {
    onCashFlowExpensesUpdate((prev) => applyAllocationSuggestions(prev, allocationPlan));
    setAllocationApplied(true);
    setSubView("flow");
    toast.success("Allocation applied — switched to Flow Diagram");
  };

  useEffect(() => {
    setAllocationApplied(false);
  }, [allocationPrefs]);

  return (
    <div className="space-y-6">
      <div
        className="flex gap-1 overflow-x-auto scrollbar-none border-b border-border pb-px"
        role="tablist"
        aria-label="Budget views"
      >
        {SUB_VIEWS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={subView === id}
            onClick={() => setSubView(id)}
            className={`shrink-0 px-4 py-2.5 text-xs border-b-2 transition-colors whitespace-nowrap -mb-px ${
              subView === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subView === "flow" && (
        <div className="space-y-5 pt-1">
          <FlowSummaryBar state={cashFlowState} />

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-6 xl:gap-8 items-start">
            <div className="space-y-6 min-w-0 xl:max-h-[calc(100vh-16rem)] xl:overflow-y-auto xl:pr-2">
              <ExpenseSectionEditor title="Necessary & Essential" category="necessary" expenses={cashFlowExpenses} onUpdate={onCashFlowExpensesUpdate} />
              <ExpenseSectionEditor title="Lifestyle & Discretionary" category="lifestyle" expenses={cashFlowExpenses} onUpdate={onCashFlowExpensesUpdate} />
              <ExpenseSectionEditor title="Savings & Risk Management" category="savingsRisk" expenses={cashFlowExpenses} onUpdate={onCashFlowExpensesUpdate} />
              {selectedNode && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="text-xs text-primary mb-2">Editing: {selectedNode.label}</div>
                  <BudgetLineItemEditor
                    label={selectedNode.label}
                    value={selectedNode.value}
                    onChange={(v) => onCashFlowExpensesUpdate(updateExpenseField(cashFlowExpenses, selectedNode.category, selectedNode.fieldKey, v))}
                  />
                </div>
              )}
            </div>

            <div className="min-w-0 xl:sticky xl:top-24">
              <CashFlowDiagram
                state={cashFlowState}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                showSummary={false}
              />
            </div>
          </div>
        </div>
      )}

      {subView === "allocate" && (
        <AllocationBucketsVisual
          plan={allocationPlan}
          prefs={allocationPrefs}
          onPrefsChange={setAllocationPrefs}
          onApplySuggestions={handleApplyAllocation}
          applied={allocationApplied}
        />
      )}

      {subView === "balance" && (
        <BalanceSheetPanel sheet={balanceSheet} onChange={onBalanceSheetUpdate} takeHomeRetirement={{ k401Balance: takeHome.k401Amount, rothIRABalance: takeHome.rothIRA, hsaBalance: takeHome.hsaAmount }} />
      )}

      {subView === "framework" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div>
              <label className="block mb-1 text-xs tracking-widest uppercase text-muted-foreground">Budget Framework</label>
              <p className="text-[11px] text-muted-foreground mb-3">Each number is the % of take-home for needs, wants, or savings.</p>
              <div className="space-y-2">{FRAMEWORKS.map((f) => <FrameworkCard key={f.id} framework={f} selected={frameworkId === f.id} monthlyIncome={monthlyIncome} onSelect={() => setFrameworkId(f.id)} />)}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <label className="text-xs tracking-widest uppercase text-muted-foreground">Monthly Take-Home</label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Drag to adjust or sync from the calculator</p>
                </div>
                {netTakeHome > 0 && !isUsingCalculator && (
                  <button type="button" onClick={() => setCustomMonthlyTakeHome(null)} className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
                    <Link2 size={12} /> Sync calculator
                  </button>
                )}
              </div>
              <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
                <div className="font-mono text-3xl text-foreground">{fmtCurrency(Math.round(monthlyIncome))}</div>
                <div className="text-xs text-muted-foreground mt-1">{fmtCurrency(income)} per year</div>
              </div>
              <RangeSlider min={sliderMin} max={sliderMax} step={50} value={Math.min(sliderMax, Math.max(sliderMin, Math.round(monthlyIncome)))} onChange={setCustomMonthlyTakeHome} accentColor="#10b981" aria-label="Monthly take-home pay" />
            </div>
          </div>
          <FrameworkOutput chartData={chartData} pieChartData={pieChartData} monthlyIncome={monthlyIncome} surplus={surplus} framework={framework} actualSpending={actualSpending} allocated={allocated} />
        </div>
      )}
    </div>
  );
}

function buildSelectedNodeMeta(nodeId: string, expenses: CashFlowExpenses) {
  const match = nodeId.match(/^(necessary|lifestyle|savingsRisk)-(.+)$/);
  if (!match) return null;
  const category = match[1] as "necessary" | "lifestyle" | "savingsRisk";
  const fieldKey = match[2];
  const labels = EXPENSE_FIELD_LABELS[category];
  if (!(fieldKey in labels)) return null;
  return {
    category,
    fieldKey,
    label: labels[fieldKey as keyof typeof labels],
    value: (expenses[category] as Record<string, number>)[fieldKey],
  };
}

function FrameworkOutput({ chartData, pieChartData, monthlyIncome, surplus, framework, actualSpending, allocated }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded border border-border bg-card p-3"><div className="text-xs text-muted-foreground mb-1">Monthly Income</div><div className="font-mono text-base">{fmtCurrency(monthlyIncome)}</div></div>
        <div className="rounded border border-border bg-card p-3"><div className="text-xs text-muted-foreground mb-1">Surplus / Deficit</div><div className={`font-mono text-base ${surplus >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtCurrency(surplus)}</div></div>
        <div className="rounded border border-border bg-card p-3"><div className="text-xs text-muted-foreground mb-1">Savings Rate</div><div className="font-mono text-base text-emerald-400">{((actualSpending.savings / (monthlyIncome || 1)) * 100).toFixed(1)}%</div></div>
      </div>
      <div className="rounded border border-border bg-card p-4">
        <div className="mb-3">
          <div className="text-xs tracking-widest uppercase text-muted-foreground">Monthly Breakdown</div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Where your take-home goes each month — one slice per expense line item from the Flow Diagram.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              strokeWidth={0}
            >
              {pieChartData.map((entry: any, index: number) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, _name: string, props: { payload?: { name: string; pct?: number } }) => [
                `${fmtCurrency(value)}${props.payload?.pct != null ? ` · ${props.payload.pct}%` : ""}`,
                props.payload?.name ?? "Expense",
              ]}
              contentStyle={{ background: "#101013", border: "1px solid #27272e", borderRadius: 8, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>

        {pieChartData.length > 0 ? (
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3">
            {pieChartData.map((entry: { name: string; value: number; color: string; pct?: number }) => (
              <li key={entry.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ background: entry.color }}
                    aria-hidden
                  />
                  <span className="text-foreground truncate">{entry.name}</span>
                </span>
                <span className="font-mono text-muted-foreground shrink-0">
                  {fmtCurrency(entry.value)}
                  {entry.pct != null ? <span className="text-[10px] ml-1">({entry.pct}%)</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">
            Add expenses on the Flow Diagram tab to see your breakdown here.
          </p>
        )}

        <table className="sr-only">
          <caption>Monthly spending breakdown</caption>
          <thead>
            <tr><th scope="col">Category</th><th scope="col">Amount</th></tr>
          </thead>
          <tbody>
            {pieChartData.map((entry: { name: string; value: number }) => (
              <tr key={entry.name}><td>{entry.name}</td><td>{fmtCurrency(entry.value)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs tracking-widest uppercase text-muted-foreground">Allocated vs Actual</div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-400/80 border border-slate-300/40" />
              Target
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary" />
              Actual
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barGap={4}>
            <XAxis dataKey="category" tick={{ fill: "#6b6b7b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6b6b7b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} width={36} />
            <Tooltip
              formatter={(value: number, name: string) => [fmtCurrency(value), name === "Allocated" ? "Target" : "Actual"]}
              contentStyle={{ background: "#101013", border: "1px solid #27272e", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="Allocated" fill="#94a3b8" radius={[3, 3, 0, 0]} name="Target" />
            <Bar dataKey="Actual" radius={[3, 3, 0, 0]} name="Actual">{chartData.map((_: any, i: number) => <Cell key={i} fill={["#6366f1", "#f59e0b", "#10b981"][i]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
        <table className="sr-only">
          <caption>Target vs actual spending by category</caption>
          <thead>
            <tr><th scope="col">Category</th><th scope="col">Target</th><th scope="col">Actual</th></tr>
          </thead>
          <tbody>
            {chartData.map((row: { category: string; Allocated: number; Actual: number }) => (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td>{fmtCurrency(row.Allocated)}</td>
                <td>{fmtCurrency(row.Actual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
