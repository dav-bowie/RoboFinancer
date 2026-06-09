import { useState, useCallback } from "react";
import { BenchmarkModule } from "./components/BenchmarkModule";
import { TakeHomeModule } from "./components/TakeHomeModule";
import { BudgetModule } from "./components/BudgetModule";
import { OfferModule } from "./components/OfferModule";
import { AIAssistant } from "./components/AIAssistant";
import { BarChart2 } from "lucide-react";

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
  const [tab, setTab] = useState<Tab>("benchmark");

  const [benchmarkCtx, setBenchmarkCtx] = useState({
    role: "Software Engineer",
    level: "L5 / Senior",
    city: "San Francisco, CA",
    totalComp: 315000,
  });

  const [takeHomeCtx, setTakeHomeCtx] = useState({
    grossSalary: 210000,
    netTakeHome: 0,
    state: "CA",
    retirementRate: 6,
  });

  const handleBenchmarkUpdate = useCallback(
    (data: { role: string; level: string; city: string; totalComp: number }) => {
      setBenchmarkCtx(data);
    },
    []
  );

  const handleTakeHomeUpdate = useCallback(
    (data: { grossSalary: number; netTakeHome: number; state: string; retirementRate: number }) => {
      setTakeHomeCtx(data);
    },
    []
  );

  const aiCtx = {
    role: benchmarkCtx.role,
    level: benchmarkCtx.level,
    city: benchmarkCtx.city,
    totalComp: benchmarkCtx.totalComp,
    grossSalary: takeHomeCtx.grossSalary,
    netTakeHome: takeHomeCtx.netTakeHome,
    state: takeHomeCtx.state,
    retirementRate: takeHomeCtx.retirementRate,
  };

  const { title, subtitle } = MODULE_DESCRIPTIONS[tab];

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
      {/* MARKER-MAKE-KIT-INVOKED */}
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
            <div className="text-xs text-muted-foreground hidden sm:block">
              No account required · All calculations local
            </div>
          </div>

          {/* Tab nav */}
          <div className="flex gap-0 overflow-x-auto scrollbar-none -mb-px">
            {TABS.map(({ id, label, short }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`shrink-0 px-4 py-3 text-xs border-b-2 transition-colors whitespace-nowrap ${
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

        {/* Module content */}
        <div>
          {tab === "benchmark" && (
            <BenchmarkModule onUpdate={handleBenchmarkUpdate} />
          )}
          {tab === "takehome" && (
            <TakeHomeModule onUpdate={handleTakeHomeUpdate} />
          )}
          {tab === "budget" && (
            <BudgetModule netTakeHome={takeHomeCtx.netTakeHome} />
          )}
          {tab === "offer" && <OfferModule />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap gap-4 justify-between">
          <p className="text-xs text-muted-foreground">
            RoboFinancer uses estimated 2024 tax brackets. Not financial advice.
          </p>
          <p className="text-xs text-muted-foreground">
            Market data sourced from Levels.fyi, Glassdoor, and Blind aggregates.
          </p>
        </div>
      </footer>

      {/* AI Assistant */}
      <AIAssistant context={aiCtx} />
    </div>
  );
}
