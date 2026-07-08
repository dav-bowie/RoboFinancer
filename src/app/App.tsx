import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { BarChart2, X, Info, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import {
  DEFAULT_CASH_FLOW_EXPENSES,
  getSpendableAnnual,
  toLegacyBudgetExpenses,
  type CashFlowExpenses,
  type TakeHomeFlowInput,
} from "../lib/cashFlowModel";
import { DEFAULT_BALANCE_SHEET, type BalanceSheetState } from "../lib/balanceSheetModel";
import { readUrlState, writeUrlState } from "../lib/useUrlState";
import {
  decodeBudgetSnapshot,
  encodeBudgetSnapshot,
} from "../lib/budgetUrlState";
import {
  DEFAULT_OFFER_COMPARISON,
  decodeOfferComparisonFromUrl,
  encodeOfferComparisonForUrl,
  mergeOfferComparison,
  type OfferComparisonSnapshot,
} from "../lib/offerUrlState";

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
    subtitle: "Interactive cash flow, bucket allocation, emergency fund targets, and balance sheet — synced from Take-Home.",
  },
  offer: {
    title: "Offer Comparison",
    subtitle: "Compare two offers with personalized weights for taxes, cost of living, commute, housing, work style, and comp mix.",
  },
};

export default function App() {
  // Read URL params once on mount for initial state
  const urlInit = readUrlState();
  const budgetInit = decodeBudgetSnapshot(urlInit.budget ?? null);

  const [tab, setTab] = useState<Tab>((urlInit.tab as Tab) ?? "benchmark");
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(() =>
    typeof sessionStorage !== "undefined" && sessionStorage.getItem("disclaimer_dismissed") === "1"
  );
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Share link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = window.location.href;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      toast.success("Share link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [benchmarkCtx, setBenchmarkCtx] = useState({
    role: urlInit.role ?? "Software Engineer",
    level: urlInit.level ?? "L5 / Senior",
    city: urlInit.city ?? "San Francisco, CA",
    totalComp: (urlInit.salary ?? 210000) + (urlInit.bonus ?? 25000) + (urlInit.equity ?? 80000),
    baseSalary: urlInit.salary ?? 210000,
    bonus: urlInit.bonus ?? 25000,
    equity: urlInit.equity ?? 80000,
    state: urlInit.state ?? "CA",
    percentile: null as number | null,
    usingLiveData: false,
  });

  const dismissDisclaimer = () => {
    sessionStorage.setItem("disclaimer_dismissed", "1");
    setDisclaimerDismissed(true);
  };

  const [takeHomeCtx, setTakeHomeCtx] = useState({
    grossSalary: urlInit.salary ?? 210000,
    netTakeHome: 0,
    state: urlInit.state ?? "CA",
    retirementRate: urlInit.k401 ?? 6,
    filingStatus: (urlInit.filing === "married" ? "married" : "single") as "single" | "married",
    k401Type: (budgetInit?.takeHomeSettings?.k401Type ?? "traditional") as "traditional" | "roth",
    k401Amount: 0,
    employerMatch: budgetInit?.takeHomeSettings?.employerMatch ?? 0,
    rothIRA: budgetInit?.takeHomeSettings?.rothIRA ?? 0,
    hsaAmount: budgetInit?.takeHomeSettings?.hsaAmount ?? 0,
    age50Plus: budgetInit?.takeHomeSettings?.age50Plus ?? false,
    age55Plus: budgetInit?.takeHomeSettings?.age55Plus ?? false,
    hsaCoverage: (budgetInit?.takeHomeSettings?.hsaCoverage ?? "self") as "self" | "family",
    federalTax: 0,
    stateTax: 0,
    socialSecurity: 0,
    medicare: 0,
    caSDI: 0,
    spendableTakeHome: 0,
  });

  const [partialLinkBanner, setPartialLinkBanner] = useState(
    () => !urlInit.budget && typeof window !== "undefined" && window.location.search.length > 0,
  );

  const [cashFlowExpenses, setCashFlowExpenses] = useState<CashFlowExpenses>(
    budgetInit?.cashFlowExpenses ?? DEFAULT_CASH_FLOW_EXPENSES,
  );
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetState>(
    budgetInit?.balanceSheet ?? DEFAULT_BALANCE_SHEET,
  );

  const [offerComparison, setOfferComparison] = useState<OfferComparisonSnapshot>(() =>
    mergeOfferComparison(DEFAULT_OFFER_COMPARISON, decodeOfferComparisonFromUrl(urlInit.offers ?? null)),
  );

  const budgetExpenses = toLegacyBudgetExpenses(cashFlowExpenses);

  const takeHomeFlow: TakeHomeFlowInput = {
    grossSalary: takeHomeCtx.grossSalary,
    netTakeHome: takeHomeCtx.netTakeHome,
    k401Amount: takeHomeCtx.k401Amount,
    hsaAmount: takeHomeCtx.hsaAmount,
    employerMatch: takeHomeCtx.employerMatch,
    rothIRA: takeHomeCtx.rothIRA,
    federalTax: takeHomeCtx.federalTax,
    stateTax: takeHomeCtx.stateTax,
    socialSecurity: takeHomeCtx.socialSecurity,
    medicare: takeHomeCtx.medicare,
    caSDI: takeHomeCtx.caSDI,
  };

  // Keep URL in sync whenever key state changes
  useEffect(() => {
    writeUrlState({
      tab,
      salary: benchmarkCtx.baseSalary,
      bonus: benchmarkCtx.bonus,
      equity: benchmarkCtx.equity,
      state: takeHomeCtx.state,
      k401: takeHomeCtx.retirementRate,
      filing: takeHomeCtx.filingStatus,
      role: benchmarkCtx.role,
      level: benchmarkCtx.level,
      city: benchmarkCtx.city,
      offers: encodeOfferComparisonForUrl(offerComparison),
      budget: encodeBudgetSnapshot({
        cashFlowExpenses,
        balanceSheet,
        takeHomeSettings: {
          k401Type: takeHomeCtx.k401Type,
          hsaAmount: takeHomeCtx.hsaAmount,
          rothIRA: takeHomeCtx.rothIRA,
          employerMatch: takeHomeCtx.employerMatch,
          age50Plus: takeHomeCtx.age50Plus,
          age55Plus: takeHomeCtx.age55Plus,
          hsaCoverage: takeHomeCtx.hsaCoverage,
        },
      }),
    });
  }, [tab, benchmarkCtx, takeHomeCtx.state, takeHomeCtx.retirementRate, takeHomeCtx.filingStatus,
      takeHomeCtx.k401Type, takeHomeCtx.hsaAmount, takeHomeCtx.rothIRA, takeHomeCtx.employerMatch,
      takeHomeCtx.age50Plus, takeHomeCtx.age55Plus, takeHomeCtx.hsaCoverage,
      offerComparison, cashFlowExpenses, balanceSheet]);

  useEffect(() => {
    document.title = `${MODULE_DESCRIPTIONS[tab].title} — RoboFinancer`;
  }, [tab]);

  const handleBenchmarkUpdate = useCallback(
    (data: {
      role: string;
      level: string;
      city: string;
      totalComp: number;
      baseSalary: number;
      bonus: number;
      equity: number;
      state: string;
      percentile: number | null;
      usingLiveData: boolean;
    }) => {
      setBenchmarkCtx(data);
    },
    [],
  );

  const handleTakeHomeUpdate = useCallback(
    (data: {
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
      hsaCoverage: "self" | "family";
      federalTax: number;
      stateTax: number;
      socialSecurity: number;
      medicare: number;
      caSDI: number;
    }) => {
      setTakeHomeCtx(data);
    },
    [],
  );

  const spendableTakeHome = takeHomeCtx.spendableTakeHome || getSpendableAnnual(takeHomeFlow);

  const aiCtx = {
    role: benchmarkCtx.role,
    level: benchmarkCtx.level,
    city: benchmarkCtx.city,
    totalComp: benchmarkCtx.totalComp,
    grossSalary: takeHomeCtx.grossSalary,
    netTakeHome: takeHomeCtx.netTakeHome,
    spendableTakeHome,
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
    percentile: benchmarkCtx.percentile ?? undefined,
    usingLiveBenchmark: benchmarkCtx.usingLiveData,
  };

  const { title, subtitle } = MODULE_DESCRIPTIONS[tab];

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <Toaster richColors position="bottom-right" />
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
                aria-label={copied ? "Share link copied" : "Copy shareable link"}
              >
                <Link2 size={12} />
                <span>{copied ? "Copied!" : "Share"}</span>
              </button>
            </div>
          </div>

          {/* Tab nav — scrollable on mobile */}
          <div
            className="flex gap-0 overflow-x-auto scrollbar-none -mb-px"
            style={{ WebkitOverflowScrolling: "touch" }}
            role="tablist"
            aria-label="RoboFinancer modules"
          >
            {TABS.map(({ id, label, short }) => (
              <button
                key={id}
                role="tab"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
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
      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Module header */}
        <div className="mb-8">
          <h1 className="text-lg font-medium text-foreground mb-1">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {partialLinkBanner && (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
            <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground flex-1">
              This shared link does not include budget, balance sheet, or contribution settings. Defaults are shown until you edit them — copy a new link after updating to share the full scenario.
            </p>
            <button
              type="button"
              onClick={() => setPartialLinkBanner(false)}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Module content — always mounted so local state is never lost on tab switch */}
        <Suspense fallback={<div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Loading…</div>}>
          <div role="tabpanel" id="panel-benchmark" aria-labelledby="tab-benchmark" className={tab === "benchmark" ? "" : "hidden"}>
            <BenchmarkModule
              onUpdate={handleBenchmarkUpdate}
              initialRole={urlInit.role}
              initialLevel={urlInit.level}
              initialCity={urlInit.city}
              initialBaseSalary={urlInit.salary}
              initialBonus={urlInit.bonus}
              initialEquity={urlInit.equity}
            />
          </div>
          <div role="tabpanel" id="panel-takehome" aria-labelledby="tab-takehome" className={tab === "takehome" ? "" : "hidden"}>
            <TakeHomeModule
              onUpdate={handleTakeHomeUpdate}
              initialGrossSalary={benchmarkCtx.baseSalary}
              initialState={benchmarkCtx.state}
              initialFilingStatus={takeHomeCtx.filingStatus}
              initialRetirementRate={urlInit.k401}
              initialTakeHomeSettings={budgetInit?.takeHomeSettings}
              budgetExpenses={budgetExpenses}
              cashFlowExpenses={cashFlowExpenses}
            />
            {benchmarkCtx.totalComp !== benchmarkCtx.baseSalary && (
              <p className="mt-4 text-xs text-muted-foreground rounded-lg border border-border bg-secondary/30 px-3 py-2">
                Take-Home taxes use <strong className="text-foreground">base salary ({benchmarkCtx.baseSalary.toLocaleString()})</strong> only.
                Bonus and equity from Benchmark ({benchmarkCtx.bonus.toLocaleString()} + {benchmarkCtx.equity.toLocaleString()}) are not taxed here.
              </p>
            )}
          </div>
          <div role="tabpanel" id="panel-budget" aria-labelledby="tab-budget" className={tab === "budget" ? "" : "hidden"}>
            <BudgetModule
              takeHome={takeHomeFlow}
              cashFlowExpenses={cashFlowExpenses}
              onCashFlowExpensesUpdate={setCashFlowExpenses}
              balanceSheet={balanceSheet}
              onBalanceSheetUpdate={setBalanceSheet}
              netTakeHome={spendableTakeHome}
            />
          </div>
          <div role="tabpanel" id="panel-offer" aria-labelledby="tab-offer" className={tab === "offer" ? "" : "hidden"}>
            <OfferModule
              taxSettings={{
                filingStatus: takeHomeCtx.filingStatus,
                k401Type: takeHomeCtx.k401Type,
                hsaAmount: takeHomeCtx.hsaAmount,
              }}
              comparison={offerComparison}
              onComparisonChange={setOfferComparison}
              onGoToTakeHome={() => setTab("takehome")}
              isActive={tab === "offer"}
            />
          </div>
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-2">
          <p className="text-xs text-muted-foreground">{DISCLAIMER}</p>
          <div className="flex flex-wrap gap-4 justify-between">
            <p className="text-xs text-muted-foreground">
              Tax brackets: 2024 federal &amp; state estimates. Contribution limits: IRS 2026.
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
