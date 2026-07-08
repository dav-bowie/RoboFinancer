import { useState, useMemo, useEffect, type Dispatch, type SetStateAction } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Link2, Check, Home, Sparkles, Shield, Heart, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { fmtCurrency } from "../../lib/calculations";
import {
  calcSpendingTotals,
  calcSurplus,
  EXPENSE_FIELD_LABELS,
  getMonthlyTakeHome,
  sumRecord,
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
import { TithingPanel } from "./TithingPanel";
import type { TithingSettings } from "../../lib/tithingModel";
import {
  applyAllocationSuggestions,
  buildAllocationPlan,
  DEFAULT_ALLOCATION_PREFERENCES,
  type AllocationPreferences,
} from "../../lib/allocationModel";
import { BudgetPanel, BudgetSubTabs, HighlightBox, StatTile, ACCENT, type BudgetAccent } from "./ui/budget-ui";

type BudgetSubView = "flow" | "allocate" | "framework" | "balance";

interface Props {
  takeHome: TakeHomeFlowInput;
  cashFlowExpenses: CashFlowExpenses;
  onCashFlowExpensesUpdate: Dispatch<SetStateAction<CashFlowExpenses>>;
  balanceSheet: BalanceSheetState;
  onBalanceSheetUpdate: (sheet: BalanceSheetState) => void;
  netTakeHome: number;
  tithingSettings: TithingSettings;
  onTithingSettingsChange: (settings: TithingSettings) => void;
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
const EXPENSE_COLORS = { housing: "#818cf8", food: "#6366f1", transport: "#4f46e5", subscriptions: "#fbbf24", entertainment: "#f59e0b", other: "#d97706", savings: "#10b981", giving: "#f59e0b", deficit: "#ef4444" } as const;

function FrameworkSplitBar({ needs, wants, savings }: { needs: number; wants: number; savings: number }) {
  return (
    <div className="flex w-full overflow-hidden rounded-full bg-muted border border-border h-2.5">
      <div style={{ width: `${needs * 100}%`, background: CATEGORY_COLORS.needs }} />
      <div style={{ width: `${wants * 100}%`, background: CATEGORY_COLORS.wants }} />
      <div style={{ width: `${savings * 100}%`, background: CATEGORY_COLORS.savings }} />
    </div>
  );
}

const EXPENSE_SECTION_META: Record<
  "necessary" | "lifestyle" | "savingsRisk" | "giving",
  { accent: BudgetAccent; icon: typeof Home; description: string }
> = {
  necessary: {
    accent: "indigo",
    icon: Home,
    description: "Housing, food, transport, and other essentials that keep life running.",
  },
  lifestyle: {
    accent: "violet",
    icon: Sparkles,
    description: "Dining, entertainment, hobbies, and the fun stuff — guilt-free when planned.",
  },
  savingsRisk: {
    accent: "emerald",
    icon: Shield,
    description: "Emergency fund, investments, insurance, and long-term security.",
  },
  giving: {
    accent: "amber",
    icon: Heart,
    description: "Missions, outreach, and generosity beyond your tithe.",
  },
};

function FrameworkCard({ framework, selected, monthlyIncome, onSelect }: { framework: (typeof FRAMEWORKS)[number]; selected: boolean; monthlyIncome: number; onSelect: () => void }) {
  const segments = [
    { key: "needs", pct: framework.needs, label: "Needs", color: CATEGORY_COLORS.needs },
    { key: "wants", pct: framework.wants, label: "Wants", color: CATEGORY_COLORS.wants },
    { key: "savings", pct: framework.savings, label: "Savings", color: CATEGORY_COLORS.savings },
  ];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-5 transition-all duration-200 ${
        selected
          ? "border-emerald-500/50 bg-gradient-to-br from-emerald-500/[0.08] via-card to-card ring-1 ring-emerald-500/20 shadow-[0_0_40px_-12px_rgba(16,185,129,0.35)]"
          : "border-border bg-card/60 hover:border-border hover:bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-lg ${selected ? "text-emerald-400" : "text-foreground"}`}>{framework.label}</span>
            <span className="text-xs text-muted-foreground">{framework.name}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{framework.description}</p>
        </div>
        {selected && (
          <div className="shrink-0 rounded-full bg-emerald-500/15 p-1.5">
            <Check size={14} className="text-emerald-400" />
          </div>
        )}
      </div>
      <FrameworkSplitBar needs={framework.needs} wants={framework.wants} savings={framework.savings} />
      <div className="grid grid-cols-3 gap-2 mt-3">
        {segments.map(({ key, pct, label, color }) => (
          <div key={key} className="rounded-lg border border-border/70 bg-background/50 px-2 py-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
            </div>
            <div className="font-mono text-sm text-foreground">{Math.round(pct * 100)}%</div>
            {monthlyIncome > 0 && (
              <div className="text-[10px] text-muted-foreground font-mono">{fmtCurrency(monthlyIncome * pct)}/mo</div>
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">Best for: {framework.bestFor}</p>
    </button>
  );
}

function ExpenseSectionEditor({
  title,
  category,
  expenses,
  onUpdate,
  fieldFilter,
}: {
  title: string;
  category: "necessary" | "lifestyle" | "savingsRisk" | "giving";
  expenses: CashFlowExpenses;
  onUpdate: (expenses: CashFlowExpenses) => void;
  fieldFilter?: (key: string) => boolean;
}) {
  const meta = EXPENSE_SECTION_META[category];
  const items = expenses[category];
  const labels = EXPENSE_FIELD_LABELS[category];
  const keys = (Object.keys(labels) as Array<keyof typeof labels>).filter((key) =>
    fieldFilter ? fieldFilter(String(key)) : true,
  );
  const monthlyTotal = sumRecord(
    Object.fromEntries(keys.map((k) => [k, items[k as keyof typeof items]])) as Record<string, number>,
  );

  return (
    <BudgetPanel
      accent={meta.accent}
      icon={meta.icon}
      title={title}
      description={meta.description}
      stats={
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg">
          <StatTile label="Monthly total" value={fmtCurrency(monthlyTotal)} accent={meta.accent} />
          <StatTile label="Annual total" value={fmtCurrency(monthlyTotal * 12)} />
          <StatTile label="Line items" value={String(keys.length)} />
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pt-5">
        {keys.map((key) => (
          <BudgetLineItemEditor
            key={String(key)}
            accent={meta.accent}
            label={labels[key]}
            value={items[key as keyof typeof items]}
            onChange={(value) => onUpdate(updateExpenseField(expenses, category, String(key), value))}
          />
        ))}
      </div>
    </BudgetPanel>
  );
}

export function BudgetModule({
  takeHome,
  cashFlowExpenses,
  onCashFlowExpensesUpdate,
  balanceSheet,
  onBalanceSheetUpdate,
  netTakeHome,
  tithingSettings,
  onTithingSettingsChange,
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

  const givingTotal = cashFlowExpenses.giving.tithing + cashFlowExpenses.giving.missions + cashFlowExpenses.giving.otherGiving;

  const pieChartData = [
    ...(givingTotal > 0 ? [{ name: "Faith & Giving", value: givingTotal, color: EXPENSE_COLORS.giving }] : []),
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
      <BudgetSubTabs tabs={SUB_VIEWS} active={subView} onChange={setSubView} label="Budget views" />

      {subView === "flow" && (
        <div className="space-y-5 pt-1">
          <FlowSummaryBar state={cashFlowState} />

          <div className="space-y-6">
            <TithingPanel
              settings={tithingSettings}
              onSettingsChange={onTithingSettingsChange}
              takeHome={takeHome}
              monthlyTithe={cashFlowExpenses.giving.tithing}
              onMonthlyTitheChange={(v) => onCashFlowExpensesUpdate(updateExpenseField(cashFlowExpenses, "giving", "tithing", v))}
              monthlySurplus={surplus}
            />

            <div className="space-y-5">
              <ExpenseSectionEditor title="Necessary & Essential" category="necessary" expenses={cashFlowExpenses} onUpdate={onCashFlowExpensesUpdate} />
              <ExpenseSectionEditor title="Lifestyle & Discretionary" category="lifestyle" expenses={cashFlowExpenses} onUpdate={onCashFlowExpensesUpdate} />
              <ExpenseSectionEditor title="Savings & Risk Management" category="savingsRisk" expenses={cashFlowExpenses} onUpdate={onCashFlowExpensesUpdate} />
              {tithingSettings.enabled && (
                <ExpenseSectionEditor
                  title="Additional Generosity"
                  category="giving"
                  expenses={cashFlowExpenses}
                  onUpdate={onCashFlowExpensesUpdate}
                  fieldFilter={(key) => key !== "tithing"}
                />
              )}
            </div>

            {selectedNode && (
              <HighlightBox accent="emerald" kicker={`Editing · ${selectedNode.label}`}>
                <BudgetLineItemEditor
                  variant="row"
                  accent="emerald"
                  label={selectedNode.label}
                  value={selectedNode.value}
                  onChange={(v) => onCashFlowExpensesUpdate(updateExpenseField(cashFlowExpenses, selectedNode.category, selectedNode.fieldKey, v))}
                />
              </HighlightBox>
            )}

            <CashFlowDiagram
              state={cashFlowState}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              showSummary={false}
              layout="bottom"
            />
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
            <BudgetPanel
              accent="emerald"
              icon={LayoutGrid}
              title="Budget Framework"
              description="Each split shows the % of take-home for needs, wants, or savings."
            >
              <div className="space-y-3 pt-5">
                {FRAMEWORKS.map((f) => (
                  <FrameworkCard
                    key={f.id}
                    framework={f}
                    selected={frameworkId === f.id}
                    monthlyIncome={monthlyIncome}
                    onSelect={() => setFrameworkId(f.id)}
                  />
                ))}
              </div>
            </BudgetPanel>

            <BudgetPanel
              accent="sky"
              icon={LayoutGrid}
              title="Monthly Take-Home"
              description="Drag to adjust or sync from the calculator."
              headerExtra={
                netTakeHome > 0 && !isUsingCalculator ? (
                  <button
                    type="button"
                    onClick={() => setCustomMonthlyTakeHome(null)}
                    className="flex items-center gap-1 text-xs text-sky-400 hover:underline shrink-0"
                  >
                    <Link2 size={12} /> Sync calculator
                  </button>
                ) : undefined
              }
              stats={
                <div className="grid grid-cols-2 gap-2 max-w-sm">
                  <StatTile label="Monthly" value={fmtCurrency(Math.round(monthlyIncome))} accent="sky" />
                  <StatTile label="Annual" value={fmtCurrency(income)} />
                </div>
              }
            >
              <div className="pt-5">
                <RangeSlider
                  min={sliderMin}
                  max={sliderMax}
                  step={50}
                  value={Math.min(sliderMax, Math.max(sliderMin, Math.round(monthlyIncome)))}
                  onChange={setCustomMonthlyTakeHome}
                  accentColor={ACCENT.sky.slider}
                  aria-label="Monthly take-home pay"
                />
              </div>
            </BudgetPanel>
          </div>
          <FrameworkOutput chartData={chartData} pieChartData={pieChartData} monthlyIncome={monthlyIncome} surplus={surplus} framework={framework} actualSpending={actualSpending} allocated={allocated} />
        </div>
      )}
    </div>
  );
}

function buildSelectedNodeMeta(nodeId: string, expenses: CashFlowExpenses) {
  const match = nodeId.match(/^(necessary|lifestyle|savingsRisk|giving)-(.+)$/);
  if (!match) return null;
  const category = match[1] as "necessary" | "lifestyle" | "savingsRisk" | "giving";
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
    <BudgetPanel
      accent="violet"
      icon={LayoutGrid}
      title="Your Breakdown"
      description={`How your take-home compares to the ${framework.label} framework.`}
      stats={
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Monthly income" value={fmtCurrency(monthlyIncome)} accent="violet" />
          <StatTile
            label="Surplus / deficit"
            value={fmtCurrency(surplus)}
            valueClassName={surplus >= 0 ? "text-emerald-400" : "text-red-400"}
          />
          <StatTile
            label="Savings rate"
            value={`${((actualSpending.savings / (monthlyIncome || 1)) * 100).toFixed(1)}%`}
            accent="emerald"
          />
        </div>
      }
    >
      <div className="space-y-4 pt-5">
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

        <div className="rounded-lg border border-border/70 bg-background/30 p-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-foreground">Allocated vs Actual</div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-400/80 border border-slate-300/40" />
                Target
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" />
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
        </div>
      </div>
    </BudgetPanel>
  );
}
