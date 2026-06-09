import { useState, useMemo, useEffect } from "react";
import {
  ROLES,
  LEVELS_BY_ROLE,
  CITIES,
  getMarketData,
  getPercentile,
  fmtCurrency,
} from "../../lib/calculations";

interface Props {
  onUpdate: (data: { role: string; level: string; city: string; totalComp: number }) => void;
}

export function BenchmarkModule({ onUpdate }: Props) {
  const [role, setRole] = useState("Software Engineer");
  const [level, setLevel] = useState("L5 / Senior");
  const [city, setCity] = useState("San Francisco, CA");
  const [baseSalary, setBaseSalary] = useState(210000);
  const [bonus, setBonus] = useState(25000);
  const [equity, setEquity] = useState(80000);

  const levels = LEVELS_BY_ROLE[role] || [];
  const totalComp = baseSalary + bonus + equity;
  const marketData = useMemo(() => getMarketData(role, level, city), [role, level, city]);
  const percentile = marketData ? getPercentile(totalComp, marketData) : null;

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    const newLevels = LEVELS_BY_ROLE[newRole] || [];
    if (!newLevels.includes(level)) setLevel(newLevels[2] || newLevels[0] || "");
  };

  useEffect(() => {
    onUpdate({ role, level, city, totalComp });
  }, [role, level, city, totalComp]);

  const percentileColor =
    percentile === null
      ? "text-muted-foreground"
      : percentile >= 75
      ? "text-emerald-400"
      : percentile >= 50
      ? "text-sky-400"
      : percentile >= 25
      ? "text-amber-400"
      : "text-red-400";

  const verdict =
    percentile === null
      ? "—"
      : percentile >= 75
      ? "Above Market"
      : percentile >= 50
      ? "At Market"
      : percentile >= 25
      ? "Below Market"
      : "Significantly Below Market";

  const markerPct = percentile !== null ? Math.min(98, Math.max(2, percentile)) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  {percentile}
                  <span className="text-xl">th</span>
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
            {percentile !== null && percentile < 50 && (
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
            {percentile !== null && percentile >= 75 && (
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
