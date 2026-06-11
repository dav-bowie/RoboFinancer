import { useState, useMemo, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Download } from "lucide-react";
import { calcTakeHome, STATE_OPTIONS, fmtCurrency, getMarginalBracket } from "../../lib/calculations";
import { generateFinancialReport } from "../../utils/generatePDF";

interface BudgetExpenses {
  housing: number;
  food: number;
  transport: number;
  otherFixed: number;
}

interface Props {
  onUpdate: (data: {
    grossSalary: number;
    netTakeHome: number;
    state: string;
    retirementRate: number;
    filingStatus: "single" | "married";
    k401Type: "traditional" | "roth";
    k401Amount: number;
    employerMatch: number;
    rothIRA: number;
    federalTax: number;
    stateTax: number;
    socialSecurity: number;
    medicare: number;
    caSDI: number;
  }) => void;
  initialGrossSalary?: number;
  initialState?: string;
  initialFilingStatus?: "single" | "married";
  initialRetirementRate?: number;
  budgetExpenses?: BudgetExpenses;
}

// Distinct slice colors, one per category in the gross-salary breakdown.
const CHART_COLORS = {
  federal: "#ef4444", // red
  state: "#f97316", // orange
  fica: "#f59e0b", // amber
  k401: "#6366f1", // indigo
  hsa: "#0ea5e9", // sky (matches HSA slider)
  caSDI: "#fb7185", // rose
  rothIRA: "#a78bfa", // violet
  takeHome: "#10b981", // emerald
};

const IRS_401K_LIMIT_2026 = 24500;
const IRS_ROTH_IRA_LIMIT_2026 = 7500; // under age 50; $8,500 if 50+
const IRS_HSA_LIMIT_2026_SINGLE = 4300; // family limit is $8,550

export function TakeHomeModule({ onUpdate, initialGrossSalary, initialState, initialFilingStatus, initialRetirementRate, budgetExpenses }: Props) {
  const [grossSalary, setGrossSalary] = useState(initialGrossSalary ?? 210000);
  const [filingStatus, setFilingStatus] = useState<"single" | "married">(initialFilingStatus ?? "single");
  const [state, setState] = useState(initialState ?? "CA");
  const [retirementRate, setRetirementRate] = useState(initialRetirementRate ?? 6);
  const [retirementType, setRetirementType] = useState<"traditional" | "roth">("traditional");
  const [hsaContrib, setHsaContrib] = useState(0);
  const [rothIraContrib, setRothIraContrib] = useState(0);
  const [employerMatchPct, setEmployerMatchPct] = useState(0);
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  const [showNameInput, setShowNameInput] = useState(false);
  const [reportName, setReportName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync when benchmark tab updates salary/state
  useEffect(() => {
    if (initialGrossSalary !== undefined) setGrossSalary(initialGrossSalary);
  }, [initialGrossSalary]);

  useEffect(() => {
    if (initialState !== undefined) setState(initialState);
  }, [initialState]);

  const breakdown = useMemo(
    () => calcTakeHome(grossSalary, filingStatus, state, retirementRate, retirementType, hsaContrib),
    [grossSalary, filingStatus, state, retirementRate, retirementType, hsaContrib]
  );

  useEffect(() => {
    onUpdate({
      grossSalary,
      netTakeHome: breakdown.netTakeHome,
      state,
      retirementRate,
      filingStatus,
      k401Type: retirementType,
      k401Amount: breakdown.retirement401k,
      employerMatch: Math.round(grossSalary * (employerMatchPct / 100)),
      rothIRA: rothIraContrib,
      federalTax: breakdown.federalTax,
      stateTax: breakdown.stateTax,
      socialSecurity: breakdown.socialSecurity,
      medicare: breakdown.medicare,
      caSDI: breakdown.caSDI ?? 0,
    });
  }, [breakdown, grossSalary, state, retirementRate, filingStatus, retirementType, employerMatchPct, rothIraContrib]);

  const div = period === "monthly" ? 12 : 1;
  const label = period === "monthly" ? "/mo" : "/yr";

  // Full decomposition of gross salary. These segments sum to gross:
  //   gross = federal + state + FICA + 401(k) + HSA + CA SDI + Roth IRA + spendable take-home
  // so each slice's share of gross is value / gross. Roth IRA is post-tax savings
  // drawn from take-home, so the "Take-Home" slice shows the spendable remainder
  // (matching the center label). Zero-value categories are omitted.
  const spendableTakeHome = breakdown.netTakeHome - rothIraContrib;
  const chartData = [
    { name: "Federal Tax", value: breakdown.federalTax, color: CHART_COLORS.federal },
    { name: "State Tax", value: breakdown.stateTax, color: CHART_COLORS.state },
    { name: "FICA", value: breakdown.socialSecurity + breakdown.medicare, color: CHART_COLORS.fica },
    { name: "401(k)", value: breakdown.retirement401k, color: CHART_COLORS.k401 },
    { name: "HSA", value: hsaContrib, color: CHART_COLORS.hsa },
    { name: "CA SDI", value: breakdown.caSDI ?? 0, color: CHART_COLORS.caSDI },
    { name: "Roth IRA", value: rothIraContrib, color: CHART_COLORS.rothIRA },
    { name: "Take-Home", value: spendableTakeHome, color: CHART_COLORS.takeHome },
  ]
    .filter((d) => d.value > 0)
    .map((d) => ({
      ...d,
      pct: breakdown.gross > 0 ? Math.round((d.value / breakdown.gross) * 100) : 0,
    }));

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

  const handleDownload = () => {
    const stdDeduction = filingStatus === "married" ? 29200 : 14600;
    const trad401k =
      retirementType === "traditional" ? breakdown.retirement401k : 0;
    const federalAGI = Math.max(0, grossSalary - trad401k - hsaContrib);
    const federalTaxableIncome = Math.max(0, federalAGI - stdDeduction);
    const caSDI = breakdown.caSDI ?? 0;
    const totalTaxes =
      breakdown.federalTax +
      breakdown.stateTax +
      breakdown.socialSecurity +
      breakdown.medicare +
      caSDI;
    const employerMatchAmount = Math.round(grossSalary * (employerMatchPct / 100));
    const monthlyTakeHome = breakdown.netTakeHome / 12;
    const rent = budgetExpenses?.housing ?? 0;
    const groceries = budgetExpenses?.food ?? 0;
    const commute = budgetExpenses?.transport ?? 0;
    const otherFixed = budgetExpenses?.otherFixed ?? 0;
    const monthlySurplus =
      monthlyTakeHome -
      rent -
      groceries -
      commute -
      Math.round(rothIraContrib / 12) -
      otherFixed;
    const totalToRetirement = trad401k + rothIraContrib + employerMatchAmount;

    generateFinancialReport({
      reportName: reportName || "User",
      reportDate: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      grossSalary,
      filingStatus,
      state,
      trad401k,
      hsa: hsaContrib,
      employerMatch: employerMatchAmount,
      rothIRA: rothIraContrib,
      federalAGI,
      standardDeduction: stdDeduction,
      federalTaxableIncome,
      federalTax: breakdown.federalTax,
      socialSecurity: breakdown.socialSecurity,
      medicare: breakdown.medicare,
      stateTax: breakdown.stateTax,
      caSDI,
      totalTaxes,
      annualTakeHome: breakdown.netTakeHome,
      monthlyTakeHome,
      rent,
      groceries,
      commute,
      otherFixed,
      effectiveFederalRate:
        breakdown.gross > 0 ? (breakdown.federalTax / breakdown.gross) * 100 : 0,
      effectiveTotalRate:
        breakdown.gross > 0 ? (totalTaxes / breakdown.gross) * 100 : 0,
      marginalBracket: getMarginalBracket(federalTaxableIncome, filingStatus),
      monthlySurplus,
      totalToRetirement,
    });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      const pct = p.payload?.pct;
      return (
        <div className="bg-popover border border-border rounded px-3 py-2 text-xs">
          <div className="text-foreground font-medium">{p.name}</div>
          <div className="font-mono text-primary">
            {fmtCurrency(p.value)}
            {pct != null ? <span className="text-muted-foreground"> · {pct}% of gross</span> : null}
          </div>
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
            <span className="font-mono text-sm text-foreground">
              {retirementRate}%
              <span className="text-muted-foreground ml-1 font-normal">
                ({fmtCurrency(Math.min(grossSalary * (retirementRate / 100), IRS_401K_LIMIT_2026))}/yr)
              </span>
            </span>
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
            <span>IRS 2026 max {fmtCurrency(IRS_401K_LIMIT_2026)}/yr</span>
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

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">
              HSA Contribution
            </label>
            <span className="font-mono text-sm text-foreground">
              {hsaContrib === 0 ? "$0/yr" : `$${hsaContrib.toLocaleString()}/yr`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={IRS_HSA_LIMIT_2026_SINGLE}
            step={100}
            value={hsaContrib}
            onChange={(e) => setHsaContrib(Number(e.target.value))}
            className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
            style={{ accentColor: "#0ea5e9" }}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>$0</span>
            <span>IRS 2026 single limit {fmtCurrency(IRS_HSA_LIMIT_2026_SINGLE)}/yr</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Pre-tax — reduces federal AGI, grows tax-free for medical
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">
              Roth IRA Contribution
            </label>
            <span className="font-mono text-sm text-foreground">{fmtCurrency(rothIraContrib)}/yr</span>
          </div>
          <input
            type="range"
            min={0}
            max={IRS_ROTH_IRA_LIMIT_2026}
            step={500}
            value={rothIraContrib}
            onChange={(e) => setRothIraContrib(Number(e.target.value))}
            className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
            style={{ accentColor: "#10b981" }}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>$0</span>
            <span>IRS 2026 limit {fmtCurrency(IRS_ROTH_IRA_LIMIT_2026)}/yr</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Post-tax savings — does not affect taxable income
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">
              Employer 401(k) Match
            </label>
            <span className="font-mono text-sm text-foreground">
              {employerMatchPct}%
              <span className="text-muted-foreground ml-1 font-normal">
                ({employerMatchPct > 0 ? `+${Math.round(grossSalary * (employerMatchPct / 100)).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}/yr free` : "none"})
              </span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={employerMatchPct}
            onChange={(e) => setEmployerMatchPct(Number(e.target.value))}
            className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
            style={{ accentColor: "#14b8a6" }}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0%</span>
            <span>10% of salary</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Free money — not counted in your gross
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
        <div className="flex items-center gap-2 flex-wrap">
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
          <div className="ml-auto flex items-center gap-2">
            {showNameInput && (
              <input
                ref={nameInputRef}
                type="text"
                placeholder="Your name (optional)"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { handleDownload(); setShowNameInput(false); }
                  if (e.key === "Escape") setShowNameInput(false);
                }}
                className="px-2 py-1 text-xs rounded border border-border bg-secondary text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36"
                autoFocus
              />
            )}
            <button
              onClick={() => {
                if (showNameInput) {
                  handleDownload();
                  setShowNameInput(false);
                } else {
                  setShowNameInput(true);
                  setTimeout(() => nameInputRef.current?.focus(), 50);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              title="Download financial breakdown PDF"
            >
              <Download size={13} />
              {showNameInput ? "Generate PDF" : "Download Report"}
            </button>
          </div>
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
            <div className="text-xs text-muted-foreground">
              {rothIraContrib > 0 ? "Spendable Take-Home" : "Take-Home"}
            </div>
            <div className="font-mono text-2xl text-primary">
              {fmtCurrency((breakdown.netTakeHome - rothIraContrib) / div)}
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
            ...(hsaContrib > 0 ? [{ label: "HSA Contribution (pre-tax)", value: -hsaContrib, color: "text-sky-500" }] : []),
            ...(breakdown.caSDI && breakdown.caSDI > 0 ? [{ label: "CA SDI (1.1%)", value: -(breakdown.caSDI), color: "text-orange-400" }] : []),
            ...(rothIraContrib > 0 ? [{ label: "Roth IRA (post-tax savings)", value: -rothIraContrib, color: "text-emerald-600" }] : []),
            { label: "Spendable Take-Home", value: breakdown.netTakeHome - rothIraContrib, color: "text-emerald-400" },
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

        {/* Legend — each category shows its share of gross salary */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {chartData.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-xs text-muted-foreground">{d.name}</span>
              <span className="text-xs font-mono text-foreground">{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
