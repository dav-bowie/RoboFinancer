import { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { calcTakeHome, STATE_OPTIONS, fmtCurrency } from "../../lib/calculations";

interface Props {
  onUpdate: (data: { grossSalary: number; netTakeHome: number; state: string; retirementRate: number }) => void;
  initialGrossSalary?: number;
  initialState?: string;
}

const SLICE_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#6366f1", "#10b981"];

export function TakeHomeModule({ onUpdate, initialGrossSalary, initialState }: Props) {
  const [grossSalary, setGrossSalary] = useState(initialGrossSalary ?? 210000);
  const [filingStatus, setFilingStatus] = useState<"single" | "married">("single");
  const [state, setState] = useState(initialState ?? "CA");
  const [retirementRate, setRetirementRate] = useState(6);
  const [retirementType, setRetirementType] = useState<"traditional" | "roth">("traditional");
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");

  // Sync when benchmark tab updates salary/state
  useEffect(() => {
    if (initialGrossSalary !== undefined) setGrossSalary(initialGrossSalary);
  }, [initialGrossSalary]);

  useEffect(() => {
    if (initialState !== undefined) setState(initialState);
  }, [initialState]);

  const breakdown = useMemo(
    () => calcTakeHome(grossSalary, filingStatus, state, retirementRate, retirementType),
    [grossSalary, filingStatus, state, retirementRate, retirementType]
  );

  useEffect(() => {
    onUpdate({ grossSalary, netTakeHome: breakdown.netTakeHome, state, retirementRate });
  }, [breakdown, grossSalary, state, retirementRate]);

  const div = period === "monthly" ? 12 : 1;
  const label = period === "monthly" ? "/mo" : "/yr";

  const chartData = [
    { name: "Federal Tax", value: breakdown.federalTax, color: SLICE_COLORS[0] },
    { name: "State Tax", value: breakdown.stateTax, color: SLICE_COLORS[1] },
    { name: "FICA", value: breakdown.socialSecurity + breakdown.medicare, color: SLICE_COLORS[2] },
    { name: "401(k)", value: breakdown.retirement401k, color: SLICE_COLORS[3] },
    { name: "Take-Home", value: breakdown.netTakeHome, color: SLICE_COLORS[4] },
  ].filter((d) => d.value > 0);

  const effectiveFederal =
    breakdown.gross > 0 ? ((breakdown.federalTax / breakdown.gross) * 100).toFixed(1) : "0";
  const totalTaxRate =
    breakdown.gross > 0
      ? (
          ((breakdown.federalTax + breakdown.stateTax + breakdown.socialSecurity + breakdown.medicare) /
            breakdown.gross) *
          100
        ).toFixed(1)
      : "0";

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded px-3 py-2 text-xs">
          <div className="text-foreground font-medium">{payload[0].name}</div>
          <div className="font-mono text-primary">{fmtCurrency(payload[0].value)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Inputs */}
      <div className="space-y-5">
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">
              Gross Salary
            </label>
            <span className="font-mono text-sm text-foreground">{fmtCurrency(grossSalary)}</span>
          </div>
          <input
            type="range"
            min={50000}
            max={800000}
            step={5000}
            value={grossSalary}
            onChange={(e) => setGrossSalary(Number(e.target.value))}
            className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
            style={{ accentColor: "#10b981" }}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>$50K</span>
            <span>$800K</span>
          </div>
        </div>

        <div>
          <label className="block mb-1.5 text-xs tracking-widest uppercase text-muted-foreground">
            State
          </label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {STATE_OPTIONS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-2 text-xs tracking-widest uppercase text-muted-foreground">
            Filing Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["single", "married"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilingStatus(s)}
                className={`py-2 px-4 rounded border text-sm transition-colors capitalize ${
                  filingStatus === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">
              401(k) Contribution
            </label>
            <span className="font-mono text-sm text-foreground">{retirementRate}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={23}
            step={1}
            value={retirementRate}
            onChange={(e) => setRetirementRate(Number(e.target.value))}
            className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
            style={{ accentColor: "#6366f1" }}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0%</span>
            <span>IRS max 23%</span>
          </div>
        </div>

        <div>
          <label className="block mb-2 text-xs tracking-widest uppercase text-muted-foreground">
            401(k) Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["traditional", "roth"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRetirementType(t)}
                className={`py-2 px-4 rounded border text-sm transition-colors capitalize ${
                  retirementType === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "traditional" ? "Traditional" : "Roth"}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-1.5">
            {retirementType === "traditional"
              ? "Pre-tax — reduces taxable income now"
              : "Post-tax — no tax on qualified withdrawals"}
          </div>
        </div>

        <div className="rounded border border-border bg-secondary p-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Effective Federal Rate</span>
            <span className="font-mono text-foreground">{effectiveFederal}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">All-in Tax Rate (excl. retirement)</span>
            <span className="font-mono text-foreground">{totalTaxRate}%</span>
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="space-y-4">
        <div className="flex gap-2">
          {(["annual", "monthly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-xs uppercase tracking-widest transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="rounded border border-border bg-card p-4">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center -mt-2">
            <div className="text-xs text-muted-foreground">Take-Home</div>
            <div className="font-mono text-2xl text-primary">
              {fmtCurrency(breakdown.netTakeHome / div)}
            </div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>

        <div className="rounded border border-border bg-card overflow-hidden">
          {[
            { label: "Gross Income", value: breakdown.gross, color: "text-foreground" },
            { label: "Federal Income Tax", value: -breakdown.federalTax, color: "text-red-400" },
            { label: "State Income Tax", value: -breakdown.stateTax, color: "text-orange-400" },
            { label: "Social Security (6.2%)", value: -breakdown.socialSecurity, color: "text-amber-400" },
            { label: "Medicare (1.45%+)", value: -breakdown.medicare, color: "text-amber-400" },
            { label: retirementType === "roth" ? "Roth 401(k) (post-tax)" : "401(k) Pre-Tax", value: -breakdown.retirement401k, color: "text-indigo-400" },
            ...(breakdown.caSDI && breakdown.caSDI > 0 ? [{ label: "CA SDI (1.1%)", value: -(breakdown.caSDI), color: "text-orange-400" }] : []),
            { label: "Net Take-Home", value: breakdown.netTakeHome, color: "text-emerald-400" },
          ].map(({ label, value, color }, i, arr) => (
            <div
              key={label}
              className={`flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 ${
                i === arr.length - 1 ? "bg-muted/20" : "hover:bg-muted/20"
              } transition-colors`}
            >
              <span className="text-sm text-muted-foreground">{label}</span>
              <div className="text-right">
                <div className={`font-mono text-sm ${color}`}>
                  {value < 0 ? "−" : ""}
                  {fmtCurrency(Math.abs(value) / div)}
                </div>
                {period === "annual" && value !== breakdown.gross && (
                  <div className="text-xs text-muted-foreground font-mono">
                    {value < 0 ? "−" : ""}
                    {fmtCurrency(Math.abs(value) / 12)}/mo
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {chartData.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              <span className="text-xs text-muted-foreground">{d.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
