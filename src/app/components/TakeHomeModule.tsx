import { useState, useMemo, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { calcTakeHome, STATE_OPTIONS, fmtCurrency, getMarginalBracket } from "../../lib/calculations";
import {
  clampContribution,
  computeContributionLimits,
  DEFAULT_LIMIT_SETTINGS,
  k401AmountFromRate,
  k401MaxRatePct,
  k401RateFromAmount,
  type ContributionLimitSettings,
  type HsaCoverage,
} from "../../lib/contributionLimits";
import type { CashFlowExpenses } from "../../lib/cashFlowModel";
import { calcSpendingTotals, EXPENSE_FIELD_LABELS } from "../../lib/cashFlowModel";
import type { TakeHomeUrlSettings } from "../../lib/budgetUrlState";
import { generateFinancialReport } from "../../utils/generatePDF";
import { RangeSlider } from "./ui/range-slider";

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
    spendableTakeHome: number;
    state: string;
    retirementRate: number;
    filingStatus: "single" | "married";
    k401Type: "traditional" | "roth";
    k401Amount: number;
    employerMatch: number;
    rothIRA: number;
    hsaAmount: number;
    age50Plus: boolean;
    age55Plus: boolean;
    hsaCoverage: HsaCoverage;
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
  initialTakeHomeSettings?: TakeHomeUrlSettings;
  budgetExpenses?: BudgetExpenses;
  cashFlowExpenses?: CashFlowExpenses;
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

function buildCashFlowReportPayload({
  grossSalary,
  breakdown,
  hsaContrib,
  rothIraContrib,
  cashFlowExpenses,
  budgetExpenses,
}: {
  grossSalary: number;
  breakdown: ReturnType<typeof calcTakeHome>;
  hsaContrib: number;
  rothIraContrib: number;
  cashFlowExpenses?: CashFlowExpenses;
  budgetExpenses?: BudgetExpenses;
}) {
  const expenses =
    cashFlowExpenses ??
    ({
      necessary: {
        housing: budgetExpenses?.housing ?? 0,
        utilities: 0,
        groceries: budgetExpenses?.food ?? 0,
        transport: budgetExpenses?.transport ?? 0,
        subscriptions: 0,
        insurance: 0,
        debtPayments: 0,
      },
      lifestyle: {
        dining: 0,
        entertainment: 0,
        hobbies: 0,
        gifts: 0,
        vacation: 0,
        other: budgetExpenses?.otherFixed ?? 0,
      },
      savingsRisk: {
        emergencySavings: 0,
        investmentAccount: 0,
        rothIRA: Math.round(rothIraContrib / 12),
        termLife: 0,
        disabilityInsurance: 0,
      },
    } satisfies CashFlowExpenses);

  const spending = calcSpendingTotals(expenses);
  const spendableAnnual = breakdown.netTakeHome - rothIraContrib;
  const monthlyTakeHome = spendableAnnual / 12;

  return {
    grossSalary,
    k401Annual: breakdown.retirement401k,
    hsaAnnual: hsaContrib,
    taxesAnnual:
      breakdown.federalTax +
      breakdown.stateTax +
      breakdown.socialSecurity +
      breakdown.medicare +
      (breakdown.caSDI ?? 0),
    monthlyTakeHome,
    necessaryMonthly: spending.necessary,
    lifestyleMonthly: spending.lifestyle,
    savingsMonthly: spending.savingsRisk,
    surplusMonthly: monthlyTakeHome - spending.total,
    lineItems: [
      ...(Object.keys(expenses.necessary) as Array<keyof typeof expenses.necessary>)
        .filter((key) => expenses.necessary[key] > 0)
        .map((key) => ({
          group: "Necessary",
          label: EXPENSE_FIELD_LABELS.necessary[key],
          monthly: expenses.necessary[key],
        })),
      ...(Object.keys(expenses.lifestyle) as Array<keyof typeof expenses.lifestyle>)
        .filter((key) => expenses.lifestyle[key] > 0)
        .map((key) => ({
          group: "Lifestyle",
          label: EXPENSE_FIELD_LABELS.lifestyle[key],
          monthly: expenses.lifestyle[key],
        })),
      ...(Object.keys(expenses.savingsRisk) as Array<keyof typeof expenses.savingsRisk>)
        .filter((key) => expenses.savingsRisk[key] > 0)
        .map((key) => ({
          group: "Savings",
          label: EXPENSE_FIELD_LABELS.savingsRisk[key],
          monthly: expenses.savingsRisk[key],
        })),
    ],
    k401Monthly: breakdown.retirement401k / 12,
    hsaMonthly: hsaContrib / 12,
    monthlyTaxes:
      (breakdown.federalTax +
        breakdown.stateTax +
        breakdown.socialSecurity +
        breakdown.medicare +
        (breakdown.caSDI ?? 0)) /
      12,
  };
}

export function TakeHomeModule({
  onUpdate,
  initialGrossSalary,
  initialState,
  initialFilingStatus,
  initialRetirementRate,
  initialTakeHomeSettings,
  budgetExpenses,
  cashFlowExpenses,
}: Props) {
  const [grossSalary, setGrossSalary] = useState(initialGrossSalary ?? 210000);
  const [filingStatus, setFilingStatus] = useState<"single" | "married">(initialFilingStatus ?? "single");
  const [state, setState] = useState(initialState ?? "CA");
  const [limitSettings, setLimitSettings] = useState<ContributionLimitSettings>(() => ({
    ...DEFAULT_LIMIT_SETTINGS,
    age50Plus: initialTakeHomeSettings?.age50Plus ?? false,
    age55Plus: initialTakeHomeSettings?.age55Plus ?? false,
    hsaCoverage: initialTakeHomeSettings?.hsaCoverage ?? "self",
  }));
  const [k401Contrib, setK401Contrib] = useState(() =>
    k401AmountFromRate(
      initialGrossSalary ?? 210000,
      initialRetirementRate ?? 6,
      computeContributionLimits(initialGrossSalary ?? 210000, DEFAULT_LIMIT_SETTINGS).k401Max,
    ),
  );
  const [retirementType, setRetirementType] = useState<"traditional" | "roth">(
    initialTakeHomeSettings?.k401Type ?? "traditional",
  );
  const [hsaContrib, setHsaContrib] = useState(initialTakeHomeSettings?.hsaAmount ?? 0);
  const [rothIraContrib, setRothIraContrib] = useState(initialTakeHomeSettings?.rothIRA ?? 0);
  const [employerMatchAmount, setEmployerMatchAmount] = useState(initialTakeHomeSettings?.employerMatch ?? 0);
  const [pdfLoading, setPdfLoading] = useState(false);
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

  const limits = useMemo(
    () => computeContributionLimits(grossSalary, limitSettings),
    [grossSalary, limitSettings],
  );

  const retirementRate = useMemo(
    () => k401RateFromAmount(grossSalary, k401Contrib),
    [grossSalary, k401Contrib],
  );

  const k401SliderMaxRate = useMemo(
    () => Math.max(0.1, k401MaxRatePct(grossSalary, limits.k401Max)),
    [grossSalary, limits.k401Max],
  );

  const k401SliderRate = Math.min(retirementRate, k401SliderMaxRate);

  useEffect(() => {
    setK401Contrib((v) => clampContribution(v, limits.k401Max));
    setHsaContrib((v) => clampContribution(v, limits.hsaMax));
    setRothIraContrib((v) => clampContribution(v, limits.rothIraMax));
    setEmployerMatchAmount((v) => clampContribution(v, limits.employerMatchMax));
  }, [limits.k401Max, limits.hsaMax, limits.rothIraMax, limits.employerMatchMax]);

  const k401Initialized = useRef(false);
  useEffect(() => {
    if (k401Initialized.current) return;
    if (initialRetirementRate !== undefined && initialGrossSalary !== undefined) {
      const max = computeContributionLimits(initialGrossSalary, limitSettings).k401Max;
      setK401Contrib(k401AmountFromRate(initialGrossSalary, initialRetirementRate, max));
      k401Initialized.current = true;
    }
  }, [initialRetirementRate, initialGrossSalary, limitSettings]);

  const breakdown = useMemo(
    () =>
      calcTakeHome(
        grossSalary,
        filingStatus,
        state,
        retirementRate,
        retirementType,
        hsaContrib,
        limits.k401Max,
      ),
    [grossSalary, filingStatus, state, retirementRate, retirementType, hsaContrib, limits.k401Max],
  );

  useEffect(() => {
    onUpdate({
      grossSalary,
      netTakeHome: breakdown.netTakeHome,
      spendableTakeHome: breakdown.netTakeHome - rothIraContrib,
      state,
      retirementRate,
      filingStatus,
      k401Type: retirementType,
      k401Amount: breakdown.retirement401k,
      employerMatch: employerMatchAmount,
      rothIRA: rothIraContrib,
      hsaAmount: hsaContrib,
      age50Plus: limitSettings.age50Plus,
      age55Plus: limitSettings.age55Plus,
      hsaCoverage: limitSettings.hsaCoverage,
      federalTax: breakdown.federalTax,
      stateTax: breakdown.stateTax,
      socialSecurity: breakdown.socialSecurity,
      medicare: breakdown.medicare,
      caSDI: breakdown.caSDI ?? 0,
    });
  }, [breakdown, grossSalary, state, retirementRate, filingStatus, retirementType, employerMatchAmount, rothIraContrib, hsaContrib, limitSettings]);

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

  const handleDownload = async () => {
    setPdfLoading(true);
    try {
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
    const spendableAnnual = breakdown.netTakeHome - rothIraContrib;
    const monthlyTakeHome = spendableAnnual / 12;
    const rent = budgetExpenses?.housing ?? 0;
    const groceries = budgetExpenses?.food ?? 0;
    const commute = budgetExpenses?.transport ?? 0;
    const otherFixed = budgetExpenses?.otherFixed ?? 0;
    const monthlySurplus =
      monthlyTakeHome -
      rent -
      groceries -
      commute -
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
      annualTakeHome: spendableAnnual,
      monthlyTakeHome,
      netTakeHomeBeforeRoth: breakdown.netTakeHome,
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
      cashFlow: buildCashFlowReportPayload({
        grossSalary,
        breakdown,
        hsaContrib,
        rothIraContrib,
        cashFlowExpenses,
        budgetExpenses,
      }),
    });
    toast.success("PDF report downloaded");
    } catch {
      toast.error("Could not generate PDF. Try again.");
    } finally {
      setPdfLoading(false);
    }
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
          <RangeSlider
            min={50000}
            max={800000}
            step={5000}
            value={grossSalary}
            onChange={setGrossSalary}
            accentColor="#10b981"
            aria-label="Gross salary"
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

        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div>
            <label className="text-xs tracking-widest uppercase text-muted-foreground">Your Contribution Limits</label>
            <p className="text-[11px] text-muted-foreground mt-1">
              Set your IRS maxes first — sliders below are capped at these amounts.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLimitSettings((s) => ({ ...s, age50Plus: !s.age50Plus }))}
              className={`py-2 px-3 rounded border text-xs text-left transition-colors ${
                limitSettings.age50Plus
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="font-medium">Age 50+ catch-up</div>
              <div className="text-[10px] opacity-80 mt-0.5">401(k) + Roth IRA</div>
            </button>
            <button
              type="button"
              onClick={() => setLimitSettings((s) => ({ ...s, age55Plus: !s.age55Plus }))}
              className={`py-2 px-3 rounded border text-xs text-left transition-colors ${
                limitSettings.age55Plus
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="font-medium">Age 55+ catch-up</div>
              <div className="text-[10px] opacity-80 mt-0.5">HSA (+$1,000/yr)</div>
            </button>
          </div>

          <div>
            <label className="block mb-2 text-[11px] text-muted-foreground">HSA coverage type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["self", "family"] as const).map((coverage) => (
                <button
                  key={coverage}
                  type="button"
                  onClick={() => setLimitSettings((s) => ({ ...s, hsaCoverage: coverage as HsaCoverage }))}
                  className={`py-2 px-3 rounded border text-xs capitalize transition-colors ${
                    limitSettings.hsaCoverage === coverage
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {coverage === "self" ? "Self-only" : "Family"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-[11px] text-muted-foreground">
              Employer match policy (max % of salary)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={limitSettings.employerMatchLimitPct}
                onChange={(e) =>
                  setLimitSettings((s) => ({
                    ...s,
                    employerMatchLimitPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                  }))
                }
                className="w-20 bg-secondary border border-border rounded px-2 py-1.5 text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground">
                → max {fmtCurrency(limits.employerMatchMax)}/yr at your salary
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
            {[
              { label: "401(k) max", value: limits.k401Max },
              { label: "HSA max", value: limits.hsaMax },
              { label: "Roth IRA max", value: limits.rothIraMax },
              { label: "Match max", value: limits.employerMatchMax },
            ].map(({ label, value }) => (
              <div key={label} className="rounded border border-border/60 bg-secondary/30 px-2.5 py-2">
                <div className="text-[10px] text-muted-foreground">{label}</div>
                <div className="font-mono text-xs text-foreground">{fmtCurrency(value)}/yr</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">
              401(k) Contribution
            </label>
            <span className="font-mono text-sm text-foreground">
              {fmtCurrency(k401Contrib)}/yr
              <span className="text-muted-foreground ml-1 font-normal">
                ({retirementRate.toFixed(1)}% of salary
                {k401Contrib >= limits.k401Max ? " · IRS max" : ""})
              </span>
            </span>
          </div>
          <RangeSlider
            min={0}
            max={k401SliderMaxRate}
            step={0.1}
            value={k401SliderRate}
            onChange={(rate) =>
              setK401Contrib(k401AmountFromRate(grossSalary, rate, limits.k401Max))
            }
            accentColor="#6366f1"
            aria-label="401(k) contribution percentage"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0%</span>
            <span>
              {k401SliderMaxRate.toFixed(1)}% max ({fmtCurrency(limits.k401Max)}/yr IRS limit)
            </span>
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
          <RangeSlider
            min={0}
            max={Math.max(limits.hsaMax, 1)}
            step={100}
            value={Math.min(hsaContrib, limits.hsaMax)}
            onChange={setHsaContrib}
            accentColor="#0ea5e9"
            aria-label="HSA contribution"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>$0</span>
            <span>Max {fmtCurrency(limits.hsaMax)}/yr</span>
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
          <RangeSlider
            min={0}
            max={Math.max(limits.rothIraMax, 1)}
            step={100}
            value={Math.min(rothIraContrib, limits.rothIraMax)}
            onChange={setRothIraContrib}
            accentColor="#10b981"
            aria-label="Roth IRA contribution"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>$0</span>
            <span>Max {fmtCurrency(limits.rothIraMax)}/yr</span>
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
              {fmtCurrency(employerMatchAmount)}/yr
              <span className="text-muted-foreground ml-1 font-normal">
                ({employerMatchAmount > 0 && grossSalary > 0
                  ? `${((employerMatchAmount / grossSalary) * 100).toFixed(1)}% of salary`
                  : "none"})
              </span>
            </span>
          </div>
          <RangeSlider
            min={0}
            max={Math.max(limits.employerMatchMax, 1)}
            step={100}
            value={Math.min(employerMatchAmount, limits.employerMatchMax)}
            onChange={setEmployerMatchAmount}
            accentColor="#14b8a6"
            aria-label="Employer 401(k) match"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>$0</span>
            <span>Max {fmtCurrency(limits.employerMatchMax)}/yr ({limitSettings.employerMatchLimitPct}% of salary)</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Free money from employer — not counted in your gross
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
                  void handleDownload();
                  setShowNameInput(false);
                } else {
                  setShowNameInput(true);
                  setTimeout(() => nameInputRef.current?.focus(), 50);
                }
              }}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
              title="Download financial breakdown PDF"
              aria-busy={pdfLoading}
            >
              {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {pdfLoading ? "Generating…" : showNameInput ? "Generate PDF" : "Download Report"}
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
          <table className="sr-only">
            <caption>Gross salary breakdown</caption>
            <thead>
              <tr><th scope="col">Category</th><th scope="col">Amount</th><th scope="col">Share of gross</th></tr>
            </thead>
            <tbody>
              {chartData.map((d) => (
                <tr key={d.name}>
                  <td>{d.name}</td>
                  <td>{fmtCurrency(d.value)}</td>
                  <td>{d.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
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
