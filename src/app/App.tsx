import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { BarChart2, X, Info, Link2, Check } from "lucide-react";
import { readUrlState, writeUrlState } from "../lib/useUrlState";
import { getMarketData, getPercentile } from "../lib/calculations";

const BenchmarkModule = lazy(() =>
  import("./components/BenchmarkModule").then((m) => ({ default: m.BenchmarkModule }))
);
const TakeHomeModule = lazy(() =>
  import("./components/TakeHomeModule").then((m) => ({ default: m.TakeHomeModule }))
);
const BudgetModule = lazy(() =>
  import("./components/BudgetModule").then((m) => ({ default: m.BudgetModule }))
);
const OfferModule = lazy(() =>
  import("./components/OfferModule").then((m) => ({ default: m.OfferModule }))
);
const AIAssistant = lazy(() =>
  import("./components/AIAssistant").then((m) => ({ default: m.AIAssistant }))
);

const DISCLAIMER =
  "RoboFinancer provides estimates and educational information only. This is not financial, tax, or legal advice. Consult a licensed professional before making financial decisions.";

type Tab = "benchmark" | "takehome" | "budget" | "offer";

const TABS: { id: Tab; label: string; short: string }[] = [
  { id: "benchmark", label: "Am I paid fairly?", short: "Benchmark" },
  { id: "takehome", label: "What do I take home?", short: "Take-Home" },
  { id: "budget", label: "Am I saving wisely?", short: "Budget" },
  { id: "offer", label: "Should I take this offer?", short: "Offer Compare" },
];

const MODULE_DESCRIPTIONS: Record<Tab, { title: string; subtitle: string }> = {
  benchmark: {
    title: "Compensation Benchmark",
    subtitle: "See where your total comp lands relative to market for your role, level, and city.",
  },
  takehome: {
    title: "Take-Home Calculator",
    subtitle: "Real-time breakdown of gross to net — federal tax, state tax, FICA, 401(k), and what's left.",
  },
  budget: {
    title: "Budget Planner",
    subtitle: "Map your take-home against a budgeting framework and see your actual vs. target split.",
  },
  offer: {
    title: "Offer Comparison",
    subtitle: "Compare two offers side-by-side factoring in taxes, cost of living, and commute costs.",
  },
};

export default function App() {
  // Read URL params once on mount for initial state
  const urlInit = readUrlState();

  const [tab, setTab] = useState<Tab>((urlInit.tab as Tab) ?? "benchmark");
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(() =>
    typeof sessionStorage !== "undefined" && sessionStorage.getItem("disclaimer_dismissed") === "1"
  );
  const [copied, setCopied] = useState(false);

  const dismissDisclaimer = () => {
    sessionStorage.setItem("disclaimer_dismissed", "1");
    setDisclaimerDismissed(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for browsers without clipboard API
      const ta = document.createElement("textarea");
      ta.value = window.location.href;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [benchmarkCtx, setBenchmarkCtx] = useState({
    role: urlInit.role ?? "Software Engineer",
    level: urlInit.level ?? "L5 / Senior",
    city: urlInit.city ?? "San Francisco, CA",
    totalComp: (urlInit.salary ?? 210000) + 25000 + 80000,
    baseSalary: urlInit.salary ?? 210000,
    state: urlInit.state ?? "CA",
  });

  const [takeHomeCtx, setTakeHomeCtx] = useState({
    grossSalary: urlInit.salary ?? 210000,
    netTakeHome: 0,
    state: urlInit.state ?? "CA",
    retirementRate: urlInit.k401 ?? 6,
    filingStatus: "single" as "single" | "married",
    k401Type: "traditional" as "traditional" | "roth",
    k401Amount: 0,
    employerMatch: 0,
    rothIRA: 0,
    federalTax: 0,
    stateTax: 0,
    socialSecurity: 0,
    medicare: 0,
    caSDI: 0,
  });

  // Shared expense state — fed into BudgetModule (display) and TakeHomeModule (PDF export)
  const [budgetExpenses, setBudgetExpenses] = useState({
    housing: 3200,
    food: 800,
    transport: 400,
    otherFixed: 0,
  });

  // Keep URL in sync whenever key state changes
  useEffect(() => {
    writeUrlState({
      tab,
      salary: benchmarkCtx.baseSalary,
      state: takeHomeCtx.state,
      k401: takeHomeCtx.retirementRate,
      role: benchmarkCtx.role,
      level: benchmarkCtx.level,
      city: benchmarkCtx.city,
    });
  }, [tab, benchmarkCtx.baseSalary, benchmarkCtx.role, benchmarkCtx.level, benchmarkCtx.city,
      takeHomeCtx.state, takeHomeCtx.retirementRate]);

  const handleBenchmarkUpdate = useCallback(
    (data: { role: string; level: string; city: string; totalComp: number; baseSalary: number; state: string }) => {
      setBenchmarkCtx(data);
    },
    []
  );

  const handleTakeHomeUpdate = useCallback(
    (data: {
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
    }) => {
      setTakeHomeCtx(data);
    },
    []
  );

  // Derive the user's market percentile from the benchmark module's inputs so the
  // AI assistant can reference it in context.
  const marketData = getMarketData(benchmarkCtx.role, benchmarkCtx.level, benchmarkCtx.city);
  const percentile = marketData ? getPercentile(benchmarkCtx.totalComp, marketData) : undefined;

  const aiCtx = {
    role: benchmarkCtx.role,
    level: benchmarkCtx.level,
    city: benchmarkCtx.city,
    totalComp: benchmarkCtx.totalComp,
    grossSalary: takeHomeCtx.grossSalary,
    netTakeHome: takeHomeCtx.netTakeHome,
    state: takeHomeCtx.state,
    retirementRate: takeHomeCtx.retirementRate,
    filingStatus: takeHomeCtx.filingStatus,
    k401Type: takeHomeCtx.k401Type,
    k401Amount: takeHomeCtx.k401Amount,
    employerMatch: takeHomeCtx.employerMatch,
    rothIRA: takeHomeCtx.rothIRA,
    federalTax: takeHomeCtx.federalTax,
    stateTax: takeHomeCtx.stateTax,
    socialSecurity: takeHomeCtx.socialSecurity,
    medicare: takeHomeCtx.medicare,
    caSDI: takeHomeCtx.caSDI,
    percentile,
  };

  const { title, subtitle } = MODULE_DESCRIPTIONS[tab];

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
      {/* MARKER-MAKE-KIT-INVOKED */}
      {/* Disclaimer banner */}
      {!disclaimerDismissed && (
        <div className="bg-muted/60 border-b border-border px-4 py-2.5 flex items-start sm:items-center gap-3">
          <Info size={14} className="text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-xs text-muted-foreground flex-1 leading-relaxed">{DISCLAIMER}</p>
          <button
            onClick={dismissDisclaimer}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-1"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
                <BarChart2 size={14} className="text-primary-foreground" />
              </div>
              <span className="text-sm font-medium tracking-tight text-foreground">
                RoboFinancer
              </span>
              <span className="hidden sm:inline text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-1">
                beta
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden sm:block">
                No account required · All calculations local
              </span>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-1"
                title="Copy shareable link"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Link2 size={12} />}
                <span>{copied ? "Copied!" : "Share"}</span>
              </button>
            </div>
          </div>

          {/* Tab nav — scrollable on mobile */}
          <div className="flex gap-0 overflow-x-auto scrollbar-none -mb-px" style={{ WebkitOverflowScrolling: "touch" }}>
            {TABS.map(({ id, label, short }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`shrink-0 px-3 sm:px-4 py-3 text-xs border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                  tab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="hidden md:inline">{label}</span>
                <span className="md:hidden">{short}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Module header */}
        <div className="mb-8">
          <h1 className="text-lg font-medium text-foreground mb-1">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Module content — always mounted so local state is never lost on tab switch */}
        <Suspense fallback={<div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Loading…</div>}>
          <div className={tab === "benchmark" ? "" : "hidden"}>
            <BenchmarkModule onUpdate={handleBenchmarkUpdate} />
          </div>
          <div className={tab === "takehome" ? "" : "hidden"}>
            <TakeHomeModule
              onUpdate={handleTakeHomeUpdate}
              initialGrossSalary={benchmarkCtx.baseSalary}
              initialState={benchmarkCtx.state}
              budgetExpenses={budgetExpenses}
            />
          </div>
          <div className={tab === "budget" ? "" : "hidden"}>
            <BudgetModule
              netTakeHome={takeHomeCtx.netTakeHome}
              expenses={budgetExpenses}
              onExpensesUpdate={setBudgetExpenses}
            />
          </div>
          <div className={tab === "offer" ? "" : "hidden"}>
            <OfferModule />
          </div>
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-2">
          <p className="text-xs text-muted-foreground">{DISCLAIMER}</p>
          <div className="flex flex-wrap gap-4 justify-between">
            <p className="text-xs text-muted-foreground">
              Uses estimated 2024 federal &amp; state tax brackets.
            </p>
            <p className="text-xs text-muted-foreground">
              Market data sourced from H1B disclosures, Levels.fyi, and Glassdoor aggregates.
            </p>
          </div>
        </div>
      </footer>

      {/* AI Assistant */}
      <Suspense fallback={null}>
        <AIAssistant context={aiCtx} />
      </Suspense>
    </div>
  );
}
