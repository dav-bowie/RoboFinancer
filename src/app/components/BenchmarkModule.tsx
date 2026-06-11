import { useState, useMemo, useEffect } from "react";
import {
  ROLES,
  LEVELS_BY_ROLE,
  CITIES,
  getMarketData,
  getPercentile,
  fmtCurrency,
} from "../../lib/calculations";
import { supabase } from "../../lib/supabaseClient";

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  if (mod10 === 1) return 'st';
  if (mod10 === 2) return 'nd';
  if (mod10 === 3) return 'rd';
  return 'th';
}

interface Props {
  onUpdate: (data: { role: string; level: string; city: string; totalComp: number; baseSalary: number; state: string }) => void;
  initialRole?: string;
  initialLevel?: string;
  initialCity?: string;
  initialBaseSalary?: number;
}

export function BenchmarkModule({ onUpdate, initialRole, initialLevel, initialCity, initialBaseSalary }: Props) {
  const [role, setRole] = useState(initialRole ?? "Software Engineer");
  const [level, setLevel] = useState(initialLevel ?? "L5 / Senior");
  const [city, setCity] = useState(initialCity ?? "San Francisco, CA");
  const [baseSalary, setBaseSalary] = useState(initialBaseSalary ?? 210000);
  const [bonus, setBonus] = useState(25000);
  const [equity, setEquity] = useState(80000);

  const levels = LEVELS_BY_ROLE[role] || [];
  const totalComp = baseSalary + bonus + equity;
  // Local fallback market data
  const fallbackMarketData = useMemo(() => getMarketData(role, level, city), [role, level, city]);

  // Supabase-driven market data (if available)
  const [marketData, setMarketData] = useState<any | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [percentile, setPercentile] = useState<number | null>(null);

  // derive a normalized role and state from selections
  const roleNormalized = role.toLowerCase().trim();
  const locationState = city.split(",").pop()?.trim() || "";

  useEffect(() => {
    let mounted = true;
    async function fetchMarket() {
      setLoadingMarket(true);
      try {
        if (!supabase) {
          // fallback to static data
          if (mounted) setMarketData(fallbackMarketData || null);
          return;
        }

        // Query salary_benchmarks filtering by role_normalized ILIKE, location_state,
        // and a years_exp range. We don't have user's years_exp input in this UI;
        // for now omit years_exp filter so we get broader matches.
        const { data, error } = await supabase
          .from("salary_benchmarks")
          .select("base_salary")
          .ilike("role_normalized", `%${roleNormalized}%`)
          .eq("location_state", locationState)
          .limit(1000);

        if (error) {
          console.error("Supabase query error:", error);
          if (mounted) setMarketData(fallbackMarketData || null);
        } else if (data && data.length > 0) {
          // compute percentiles from base_salary values
          const salaries = data.map((r: any) => Number(r.base_salary)).filter(Boolean).sort((a: number, b: number) => a - b);
          const p25 = salaries[Math.floor(0.25 * (salaries.length - 1))] || fallbackMarketData?.p25 || 0;
          const p50 = salaries[Math.floor(0.5 * (salaries.length - 1))] || fallbackMarketData?.p50 || 0;
          const p75 = salaries[Math.floor(0.75 * (salaries.length - 1))] || fallbackMarketData?.p75 || 0;
          const p90 = salaries[Math.floor(0.9 * (salaries.length - 1))] || fallbackMarketData?.p90 || 0;

          const computed = { p25, p50, p75, p90 };
          if (mounted) setMarketData(computed);

          // percentile rank of totalComp among salaries
          const idx = salaries.findIndex((s: number) => s >= totalComp);
          const rank = idx === -1 ? 100 : Math.round((idx / Math.max(1, salaries.length - 1)) * 100);
          if (mounted) setPercentile(rank);
        } else {
          if (mounted) setMarketData(fallbackMarketData || null);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setMarketData(fallbackMarketData || null);
      } finally {
        if (mounted) setLoadingMarket(false);
      }
    }

    fetchMarket();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, level, city, totalComp]);

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    const newLevels = LEVELS_BY_ROLE[newRole] || [];
    if (!newLevels.includes(level)) setLevel(newLevels[2] || newLevels[0] || "");
  };

  useEffect(() => {
    onUpdate({ role, level, city, totalComp, baseSalary, state: locationState });
  }, [role, level, city, totalComp, baseSalary, locationState]);

  // Use the data we're actually displaying as the source for percentile computation,
  // falling back to fallbackMarketData so static-only mode always produces a number.
  const effectiveData = marketData ?? fallbackMarketData;
  const actualPercentile = percentile !== null
    ? percentile
    : effectiveData
      ? getPercentile(totalComp, effectiveData)
      : null;

  const percentileColor =
    actualPercentile === null
      ? "text-muted-foreground"
      : actualPercentile >= 75
        ? "text-emerald-400"
        : actualPercentile >= 50
          ? "text-sky-400"
          : actualPercentile >= 25
            ? "text-amber-400"
            : "text-red-400";

  const verdict =
    actualPercentile === null
      ? "—"
      : actualPercentile >= 75
        ? "Above Market"
        : actualPercentile >= 50
          ? "At Market"
          : actualPercentile >= 25
            ? "Below Market"
            : "Significantly Below Market";

  const markerPct = actualPercentile !== null ? Math.min(98, Math.max(2, actualPercentile)) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
      {/* Inputs */}
      <div className="space-y-5">
        <div>
          <label className="block mb-1.5 text-xs tracking-widest uppercase text-muted-foreground">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1.5 text-xs tracking-widest uppercase text-muted-foreground">
            Level
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1.5 text-xs tracking-widest uppercase text-muted-foreground">
            Location
          </label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block mb-1.5 text-xs tracking-widest uppercase text-muted-foreground">
              Base
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                value={baseSalary}
                onChange={(e) => setBaseSalary(Number(e.target.value))}
                className="w-full bg-secondary border border-border rounded px-3 py-2.5 pl-6 text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block mb-1.5 text-xs tracking-widest uppercase text-muted-foreground">
              Bonus
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                value={bonus}
                onChange={(e) => setBonus(Number(e.target.value))}
                className="w-full bg-secondary border border-border rounded px-3 py-2.5 pl-6 text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block mb-1.5 text-xs tracking-widest uppercase text-muted-foreground">
              Equity/yr
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                value={equity}
                onChange={(e) => setEquity(Number(e.target.value))}
                className="w-full bg-secondary border border-border rounded px-3 py-2.5 pl-6 text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="rounded border border-border bg-secondary p-4">
          <div className="text-xs text-muted-foreground mb-0.5">Your Total Comp</div>
          <div className="font-mono text-2xl text-foreground">{fmtCurrency(totalComp)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {fmtCurrency(baseSalary)} base · {fmtCurrency(bonus)} bonus · {fmtCurrency(equity)} equity
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="space-y-5">
        {marketData ? (
          <>
            <div className="rounded border border-border bg-card p-5">
              <div className="text-xs tracking-widest uppercase text-muted-foreground mb-3">
                Market Position
              </div>
              <div className="flex items-baseline gap-3 mb-1">
                <span className={`font-mono text-4xl font-medium ${percentileColor}`}>
                  {actualPercentile}
                  <span className="text-xl">{actualPercentile !== null ? ordinalSuffix(actualPercentile) : 'th'}</span>
                </span>
                <span className="text-sm text-muted-foreground">percentile</span>
              </div>
              <div className={`text-sm font-medium mb-4 ${percentileColor}`}>{verdict}</div>

              {/* Percentile bar */}
              <div className="relative h-2 bg-muted rounded-full mb-3">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{
                    width: `${markerPct}%`,
                    background: "linear-gradient(to right, #1d4ed8, #10b981)",
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background bg-primary transition-all duration-500"
                  style={{ left: `calc(${markerPct}% - 6px)` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>p25</span>
                <span>p50</span>
                <span>p75</span>
                <span>p90</span>
              </div>
            </div>

            {/* Market range table */}
            <div className="rounded border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-xs tracking-widest uppercase text-muted-foreground">
                  {role} · {level} · {city}
                </span>
              </div>
              {[
                { label: "25th Percentile", value: marketData.p25, note: "entry-band" },
                { label: "50th Percentile", value: marketData.p50, note: "market median" },
                { label: "75th Percentile", value: marketData.p75, note: "competitive" },
                { label: "90th Percentile", value: marketData.p90, note: "top of market" },
              ].map(({ label, value, note }) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <div className="text-sm text-foreground">{label}</div>
                    <div className="text-xs text-muted-foreground">{note}</div>
                  </div>
                  <div className="font-mono text-sm text-foreground">{fmtCurrency(value)}</div>
                </div>
              ))}
            </div>

            {/* Negotiation insight */}
            {actualPercentile !== null && actualPercentile < 50 && (
              <div className="rounded border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="text-xs text-amber-400 mb-2 uppercase tracking-widest">Negotiation Range</div>
                <p className="text-sm text-foreground">
                  You have room to negotiate up to{" "}
                  <span className="font-mono text-primary">{fmtCurrency(marketData.p50)}</span>{" "}
                  (market median) — a potential increase of{" "}
                  <span className="font-mono text-primary">
                    {fmtCurrency(marketData.p50 - totalComp)}
                  </span>
                  . Reference your p75 of{" "}
                  <span className="font-mono">{fmtCurrency(marketData.p75)}</span> as your stretch target.
                </p>
              </div>
            )}
            {actualPercentile !== null && actualPercentile >= 75 && (
              <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="text-xs text-emerald-400 mb-2 uppercase tracking-widest">Market Read</div>
                <p className="text-sm text-foreground">
                  Your comp is strong relative to market. To push further, focus on promotion to the next level or target FAANG/unicorn equity packages that can add 30–60% to your total comp.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="rounded border border-border bg-card p-8 text-center text-muted-foreground text-sm">
            Select a role and level to see market data.
          </div>
        )}
      </div>
    </div>
  );
}
