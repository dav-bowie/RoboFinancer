import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { fmtCurrency } from "../../lib/calculations";

interface BudgetExpenses {
  housing: number;
  food: number;
  transport: number;
  otherFixed: number;
}

interface Props {
  netTakeHome: number;
  expenses?: BudgetExpenses;
  onExpensesUpdate?: (expenses: BudgetExpenses) => void;
}

const FRAMEWORKS = [
  { id: "50-30-20", label: "50/30/20", needs: 0.5, wants: 0.3, savings: 0.2 },
  { id: "60-30-10", label: "60/30/10", needs: 0.6, wants: 0.3, savings: 0.1 },
  { id: "70-20-10", label: "70/20/10", needs: 0.7, wants: 0.2, savings: 0.1 },
  { id: "40-30-30", label: "40/30/30", needs: 0.4, wants: 0.3, savings: 0.3 },
];

export function BudgetModule({ netTakeHome, expenses, onExpensesUpdate }: Props) {
  const [frameworkId, setFrameworkId] = useState("50-30-20");
  const [customTakeHome, setCustomTakeHome] = useState<number | null>(null);
  const [housing, setHousingLocal] = useState(expenses?.housing ?? 3200);
  const [food, setFoodLocal] = useState(expenses?.food ?? 800);
  const [transport, setTransportLocal] = useState(expenses?.transport ?? 400);
  const [subscriptions, setSubscriptions] = useState(200);
  const [entertainment, setEntertainment] = useState(500);
  const [other, setOther] = useState(expenses?.otherFixed ?? 0);

  const setHousing = (v: number) => { setHousingLocal(v); onExpensesUpdate?.({ housing: v, food, transport, otherFixed: other }); };
  const setFood = (v: number) => { setFoodLocal(v); onExpensesUpdate?.({ housing, food: v, transport, otherFixed: other }); };
  const setTransport = (v: number) => { setTransportLocal(v); onExpensesUpdate?.({ housing, food, transport: v, otherFixed: other }); };
  const setOtherWithCb = (v: number) => { setOther(v); onExpensesUpdate?.({ housing, food, transport, otherFixed: v }); };

  const income = customTakeHome ?? netTakeHome;
  const monthlyIncome = income / 12;

  const framework = FRAMEWORKS.find((f) => f.id === frameworkId) || FRAMEWORKS[0];
  const allocated = {
    needs: monthlyIncome * framework.needs,
    wants: monthlyIncome * framework.wants,
    savings: monthlyIncome * framework.savings,
  };

  const actualSpending = {
    needs: housing + food + transport,
    wants: subscriptions + entertainment + other,
    savings: 0,
  };
  actualSpending.savings = Math.max(0, monthlyIncome - actualSpending.needs - actualSpending.wants);

  const surplus = monthlyIncome - actualSpending.needs - actualSpending.wants;

  const chartData = [
    {
      category: "Needs",
      Allocated: Math.round(allocated.needs),
      Actual: Math.round(actualSpending.needs),
    },
    {
      category: "Wants",
      Allocated: Math.round(allocated.wants),
      Actual: Math.round(actualSpending.wants),
    },
    {
      category: "Savings",
      Allocated: Math.round(allocated.savings),
      Actual: Math.round(actualSpending.savings),
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded px-3 py-2 text-xs space-y-1">
          <div className="text-foreground font-medium">{label}</div>
          {payload.map((p: any) => (
            <div key={p.name} className="flex justify-between gap-4">
              <span style={{ color: p.fill }}>{p.name}</span>
              <span className="font-mono">{fmtCurrency(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const actionItem = useMemo(() => {
    if (!monthlyIncome) return null;
    const savingsRate = (actualSpending.savings / monthlyIncome) * 100;
    const targetRate = framework.savings * 100;
    if (surplus < 0) {
      const overage = Math.abs(surplus);
      return {
        type: "warning",
        text: `You're spending ${fmtCurrency(overage)}/mo more than you take home. Cutting wants by ${Math.round((overage / (actualSpending.wants || 1)) * 100)}% would bring you to break-even.`,
      };
    }
    if (savingsRate < targetRate - 5) {
      const gap = allocated.savings - actualSpending.savings;
      return {
        type: "nudge",
        text: `Your effective savings rate is ${savingsRate.toFixed(1)}% — below the ${targetRate}% target for the ${framework.label} framework. Automating an additional ${fmtCurrency(gap)} per month would close the gap.`,
      };
    }
    return {
      type: "success",
      text: `You're tracking well against the ${framework.label} framework with a savings rate of ${savingsRate.toFixed(1)}%. Consider maxing your 401(k) (${fmtCurrency(24500)} IRS 2026 limit) and HSA if eligible.`,
    };
  }, [surplus, actualSpending, allocated, framework, monthlyIncome]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Inputs */}
      <div className="space-y-5">
        <div>
          <label className="block mb-2 text-xs tracking-widest uppercase text-muted-foreground">
            Framework
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FRAMEWORKS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFrameworkId(f.id)}
                className={`py-2 px-3 rounded border text-sm transition-colors ${
                  frameworkId === f.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="font-mono">{f.label}</div>
                <div className="text-xs opacity-70">needs/wants/savings</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">
              Monthly Take-Home
            </label>
            {netTakeHome > 0 && (
              <button
                onClick={() => setCustomTakeHome(null)}
                className="text-xs text-primary hover:underline"
              >
                Use calculator value
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input
              type="number"
              value={Math.round(income / 12)}
              onChange={(e) => setCustomTakeHome(Number(e.target.value) * 12)}
              className="w-full bg-secondary border border-border rounded px-3 py-2.5 pl-6 text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {fmtCurrency(income)} annually
            {netTakeHome > 0 && customTakeHome === null && " · auto from Take-Home calculator"}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs tracking-widest uppercase text-muted-foreground mb-2">Needs</div>
          {[
            { label: "Housing (rent/mortgage)", value: housing, set: setHousing },
            { label: "Food & Groceries", value: food, set: setFood },
            { label: "Transport", value: transport, set: setTransport },
          ].map(({ label, value, set }) => (
            <div key={label} className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground w-36 shrink-0">{label}</label>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 pl-6 text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <div className="text-xs tracking-widest uppercase text-muted-foreground mb-2">Wants</div>
          {[
            { label: "Subscriptions", value: subscriptions, set: setSubscriptions },
            { label: "Entertainment", value: entertainment, set: setEntertainment },
            { label: "Other", value: other, set: setOtherWithCb },
          ].map(({ label, value, set }) => (
            <div key={label} className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground w-36 shrink-0">{label}</label>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 pl-6 text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Output */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Monthly Income", value: monthlyIncome, color: "text-foreground" },
            {
              label: "Surplus / Deficit",
              value: surplus,
              color: surplus >= 0 ? "text-emerald-400" : "text-red-400",
            },
            {
              label: "Savings Rate",
              value: null,
              display: `${((actualSpending.savings / (monthlyIncome || 1)) * 100).toFixed(1)}%`,
              color:
                (actualSpending.savings / (monthlyIncome || 1)) * 100 >= framework.savings * 100
                  ? "text-emerald-400"
                  : "text-amber-400",
            },
          ].map(({ label, value, display, color }) => (
            <div key={label} className="rounded border border-border bg-card p-3">
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <div className={`font-mono text-base ${color}`}>
                {display ?? fmtCurrency(value!)}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded border border-border bg-card p-4">
          <div className="text-xs tracking-widest uppercase text-muted-foreground mb-3">
            Allocated vs Actual · Monthly
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={4} barCategoryGap="30%">
              <XAxis dataKey="category" tick={{ fill: "#6b6b7b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#6b6b7b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="Allocated" fill="#27272e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Actual" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, index) => {
                  const isOver = entry.Actual > entry.Allocated;
                  const colors = ["#6366f1", "#f59e0b", "#10b981"];
                  return <Cell key={`cell-${index}`} fill={isOver && index < 2 ? "#ef4444" : colors[index]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-secondary border border-border" />
              <span className="text-xs text-muted-foreground">Allocated</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-primary" />
              <span className="text-xs text-muted-foreground">Actual</span>
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="rounded border border-border bg-card overflow-hidden">
          {chartData.map((row) => {
            const pct = monthlyIncome > 0 ? (row.Actual / monthlyIncome) * 100 : 0;
            const targetPct =
              row.category === "Needs"
                ? framework.needs * 100
                : row.category === "Wants"
                ? framework.wants * 100
                : framework.savings * 100;
            const isOver = row.Actual > row.Allocated && row.category !== "Savings";
            return (
              <div key={row.category} className="px-4 py-3 border-b border-border last:border-0">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-foreground">{row.category}</span>
                  <div className="flex gap-3 font-mono text-xs">
                    <span className="text-muted-foreground">{fmtCurrency(row.Allocated)} target</span>
                    <span className={isOver ? "text-red-400" : "text-foreground"}>{fmtCurrency(row.Actual)} actual</span>
                  </div>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, pct / (targetPct / 100))}%`,
                      background: isOver ? "#ef4444" : row.category === "Savings" ? "#10b981" : "#6366f1",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{pct.toFixed(1)}% of income</span>
                  <span>target: {targetPct}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {actionItem && (
          <div
            className={`rounded border p-4 ${
              actionItem.type === "warning"
                ? "border-red-500/20 bg-red-500/5"
                : actionItem.type === "nudge"
                ? "border-amber-500/20 bg-amber-500/5"
                : "border-emerald-500/20 bg-emerald-500/5"
            }`}
          >
            <div
              className={`text-xs uppercase tracking-widest mb-2 ${
                actionItem.type === "warning"
                  ? "text-red-400"
                  : actionItem.type === "nudge"
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              AI Action Item
            </div>
            <p className="text-sm text-foreground">{actionItem.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
