import { useState, useMemo, useEffect } from "react";
import { ArrowRight, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { calcTakeHome, STATE_OPTIONS, CITIES, COST_OF_LIVING_INDEX, fmtCurrency } from "../../lib/calculations";

interface OfferInputs {
  label: string;
  company: string;
  state: string;
  city: string;
  baseSalary: number;
  bonus: number;
  equity: number;
  retirementRate: number;
  commuteCost: number;
  commuteHrsWeek: number;
}

// Teleport urban area slugs for supported cities
const TELEPORT_SLUGS: Record<string, string> = {
  "San Francisco, CA": "san-francisco-bay-area",
  "San Jose, CA": "san-jose",
  "New York, NY": "new-york",
  "Seattle, WA": "seattle",
  "Boston, MA": "boston",
  "Los Angeles, CA": "los-angeles",
  "San Diego, CA": "san-diego",
  "Austin, TX": "austin",
  "Denver, CO": "denver",
  "Chicago, IL": "chicago",
  "Atlanta, GA": "atlanta",
  "Miami, FL": "miami",
  "Dallas, TX": "dallas",
  "Portland, OR": "portland-or",
  "Washington, DC": "washington-dc",
  "Raleigh, NC": "raleigh",
  "Phoenix, AZ": "phoenix",
  "Nashville, TN": "nashville",
  "Minneapolis, MN": "minneapolis",
};

interface TeleportScore {
  score: number | null;
  loading: boolean;
}

async function fetchTeleportColScore(city: string): Promise<number | null> {
  const slug = TELEPORT_SLUGS[city];
  if (!slug) return null;
  try {
    const res = await fetch(`https://api.teleport.org/api/urban_areas/slug:${slug}/scores/`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const categories: Array<{ name: string; score_out_of_10: number }> = data?.categories ?? [];
    const colCat = categories.find((c) => c.name === "Cost of Living");
    return colCat ? Math.round(colCat.score_out_of_10 * 10) / 10 : null;
  } catch {
    return null;
  }
}

function useTeleportScore(city: string): TeleportScore {
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchTeleportColScore(city).then((s) => {
      if (active) { setScore(s); setLoading(false); }
    });
    return () => { active = false; };
  }, [city]);
  return { score, loading };
}

function OfferColumn({
  offer,
  onChange,
  label,
}: {
  offer: OfferInputs;
  onChange: (updates: Partial<OfferInputs>) => void;
  label: string;
}) {
  return (
    <div className="rounded border border-border bg-card p-5 space-y-4">
      <div className="text-xs tracking-widest uppercase text-muted-foreground">{label}</div>

      <div>
        <label className="block mb-1 text-xs text-muted-foreground">Company</label>
        <input
          type="text"
          value={offer.company}
          onChange={(e) => onChange({ company: e.target.value })}
          className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 text-xs text-muted-foreground">State</label>
          <select
            value={offer.state}
            onChange={(e) => onChange({ state: e.target.value })}
            className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {STATE_OPTIONS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 text-xs text-muted-foreground">City</label>
          <select
            value={offer.city}
            onChange={(e) => onChange({ city: e.target.value })}
            className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {[
        { label: "Base Salary", key: "baseSalary" as const },
        { label: "Annual Bonus", key: "bonus" as const },
        { label: "Equity / yr", key: "equity" as const },
      ].map(({ label: lbl, key }) => (
        <div key={key}>
          <label className="block mb-1 text-xs text-muted-foreground">{lbl}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
            <input
              type="number"
              value={offer[key] as number}
              onChange={(e) => onChange({ [key]: Number(e.target.value) })}
              className="w-full bg-secondary border border-border rounded px-3 py-2 pl-6 text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      ))}

      <div>
        <div className="flex justify-between mb-1">
          <label className="text-xs text-muted-foreground">401(k) Rate</label>
          <span className="font-mono text-xs text-foreground">{offer.retirementRate}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={23}
          step={1}
          value={offer.retirementRate}
          onChange={(e) => onChange({ retirementRate: Number(e.target.value) })}
          className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
          style={{ accentColor: "#10b981" }}
        />
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <div className="text-xs tracking-widest uppercase text-muted-foreground">Commute</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-xs text-muted-foreground">$/month</label>
            <input
              type="number"
              value={offer.commuteCost}
              onChange={(e) => onChange({ commuteCost: Number(e.target.value) })}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block mb-1 text-xs text-muted-foreground">hrs/week</label>
            <input
              type="number"
              value={offer.commuteHrsWeek}
              onChange={(e) => onChange({ commuteHrsWeek: Number(e.target.value) })}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function OfferModule() {
  const [current, setCurrent] = useState<OfferInputs>({
    label: "Current Role",
    company: "Acme Corp",
    state: "CA",
    city: "San Francisco, CA",
    baseSalary: 185000,
    bonus: 20000,
    equity: 60000,
    retirementRate: 6,
    commuteCost: 180,
    commuteHrsWeek: 8,
  });

  const [newOffer, setNewOffer] = useState<OfferInputs>({
    label: "New Offer",
    company: "Startup Co",
    state: "WA",
    city: "Seattle, WA",
    baseSalary: 210000,
    bonus: 25000,
    equity: 80000,
    retirementRate: 6,
    commuteCost: 120,
    commuteHrsWeek: 5,
  });

  const currTeleport = useTeleportScore(current.city);
  const nextTeleport = useTeleportScore(newOffer.city);

  const calc = (o: OfferInputs) => {
    const totalComp = o.baseSalary + o.bonus + o.equity;
    const taxBreakdown = calcTakeHome(o.baseSalary + o.bonus, "single", o.state, o.retirementRate);
    const annualCommuteCost = o.commuteCost * 12;
    const annualCommuteTimeHrs = o.commuteHrsWeek * 50;
    const col = COST_OF_LIVING_INDEX[o.city] || 100;
    // True take-home = net + equity (vested) - commute
    const trueAnnual = taxBreakdown.netTakeHome + o.equity - annualCommuteCost;
    return { totalComp, taxBreakdown, annualCommuteCost, annualCommuteTimeHrs, col, trueAnnual };
  };

  const curr = useMemo(() => calc(current), [current]);
  const next = useMemo(() => calc(newOffer), [newOffer]);

  const currAdjustedTakeHome = curr.trueAnnual / (curr.col / 100);
  const nextAdjustedTakeHome = next.trueAnnual / (next.col / 100);

  const delta = nextAdjustedTakeHome - currAdjustedTakeHome;
  const deltaRaw = next.taxBreakdown.netTakeHome + newOffer.equity - curr.taxBreakdown.netTakeHome - current.equity;

  const winner = delta > 5000 ? "new" : delta < -5000 ? "current" : "tie";

  // Hourly rate for commute time valuation
  const impliedHourlyRate = Math.round(((curr.taxBreakdown.netTakeHome + next.taxBreakdown.netTakeHome) / 2) / 2000);

  const Row = ({
    label,
    currVal,
    newVal,
    mono = true,
    highlight = false,
    currColor,
    newColor,
  }: {
    label: string;
    currVal: string;
    newVal: string;
    mono?: boolean;
    highlight?: boolean;
    currColor?: string;
    newColor?: string;
  }) => (
    <div
      className={`flex items-center py-2.5 px-4 border-b border-border last:border-0 gap-4 ${
        highlight ? "bg-muted/10" : ""
      }`}
    >
      <div className="text-xs text-muted-foreground w-44 shrink-0">{label}</div>
      <div className={`flex-1 text-right ${mono ? "font-mono" : ""} text-sm ${currColor ?? "text-foreground"}`}>{currVal}</div>
      <ArrowRight size={12} className="text-muted-foreground shrink-0" />
      <div className={`flex-1 text-left ${mono ? "font-mono" : ""} text-sm ${newColor ?? "text-foreground"}`}>{newVal}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OfferColumn
          offer={current}
          onChange={(u) => setCurrent((p) => ({ ...p, ...u }))}
          label="Current Role"
        />
        <OfferColumn
          offer={newOffer}
          onChange={(u) => setNewOffer((p) => ({ ...p, ...u }))}
          label="New Offer"
        />
      </div>

      {/* Comparison table */}
      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs tracking-widest uppercase text-muted-foreground">Side-by-Side Comparison</span>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{current.company}</span>
            <span className="font-medium text-foreground">{newOffer.company}</span>
          </div>
        </div>
        <div>
          <Row label="Total Comp (gross)" currVal={fmtCurrency(curr.totalComp)} newVal={fmtCurrency(next.totalComp)} />
          <Row
            label="Federal Income Tax"
            currVal={`-${fmtCurrency(curr.taxBreakdown.federalTax)}`}
            newVal={`-${fmtCurrency(next.taxBreakdown.federalTax)}`}
            currColor="text-red-400"
            newColor="text-red-400"
          />
          <Row
            label="State Income Tax"
            currVal={`-${fmtCurrency(curr.taxBreakdown.stateTax)}`}
            newVal={`-${fmtCurrency(next.taxBreakdown.stateTax)}`}
            currColor="text-orange-400"
            newColor="text-orange-400"
          />
          <Row
            label="Net Take-Home (salary)"
            currVal={fmtCurrency(curr.taxBreakdown.netTakeHome)}
            newVal={fmtCurrency(next.taxBreakdown.netTakeHome)}
            highlight
          />
          <Row
            label="Annual Commute Cost"
            currVal={`-${fmtCurrency(curr.annualCommuteCost)}`}
            newVal={`-${fmtCurrency(next.annualCommuteCost)}`}
            currColor="text-muted-foreground"
            newColor="text-muted-foreground"
          />
          <Row
            label="Commute Time / yr"
            currVal={`${curr.annualCommuteTimeHrs} hrs`}
            newVal={`${next.annualCommuteTimeHrs} hrs`}
            mono={false}
          />
          <Row
            label="Cost of Living Index"
            currVal={`${curr.col}`}
            newVal={`${next.col}`}
          />
          {/* Teleport live CoL score */}
          <Row
            label={`Teleport CoL Score${currTeleport.loading || nextTeleport.loading ? " …" : ""}`}
            currVal={currTeleport.score !== null ? `${currTeleport.score}/10` : "—"}
            newVal={nextTeleport.score !== null ? `${nextTeleport.score}/10` : "—"}
            mono={false}
          />
          <Row
            label="CoL-Adjusted Take-Home"
            currVal={fmtCurrency(currAdjustedTakeHome)}
            newVal={fmtCurrency(nextAdjustedTakeHome)}
            highlight
          />
          <Row
            label="Adjusted Δ vs. Current"
            currVal="—"
            newVal={`${delta >= 0 ? "+" : ""}${fmtCurrency(delta)}`}
            newColor={delta > 5000 ? "text-emerald-400" : delta < -5000 ? "text-red-400" : "text-muted-foreground"}
          />
        </div>
      </div>

      {/* Commute time cost note */}
      {(curr.annualCommuteTimeHrs > 0 || next.annualCommuteTimeHrs > 0) && (
        <div className="rounded border border-border bg-secondary/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Commute time cost: </span>
            At your implied hourly rate of ~${impliedHourlyRate}/hr, {current.company}&apos;s{" "}
            {curr.annualCommuteTimeHrs} hrs/yr of commute costs an additional{" "}
            <span className="font-mono text-foreground">{fmtCurrency(curr.annualCommuteTimeHrs * impliedHourlyRate)}</span> in
            time value. {newOffer.company}&apos;s commute costs{" "}
            <span className="font-mono text-foreground">{fmtCurrency(next.annualCommuteTimeHrs * impliedHourlyRate)}</span>.
          </p>
        </div>
      )}

      {/* Teleport attribution */}
      {(currTeleport.score !== null || nextTeleport.score !== null) && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ExternalLink size={11} />
          <span>
            CoL scores sourced from{" "}
            <a href="https://teleport.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              Teleport
            </a>{" "}
            · 10 = most affordable
          </span>
        </div>
      )}

      {/* Verdict */}
      <div
        className={`rounded border p-5 ${
          winner === "new"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : winner === "current"
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-border bg-card"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {winner === "new" ? (
              <TrendingUp size={18} className="text-emerald-400" />
            ) : winner === "current" ? (
              <TrendingDown size={18} className="text-amber-400" />
            ) : (
              <Minus size={18} className="text-muted-foreground" />
            )}
          </div>
          <div>
            <div
              className={`text-sm font-medium mb-2 ${
                winner === "new"
                  ? "text-emerald-400"
                  : winner === "current"
                  ? "text-amber-400"
                  : "text-muted-foreground"
              }`}
            >
              {winner === "new"
                ? `Take the offer at ${newOffer.company}`
                : winner === "current"
                ? `Stay at ${current.company}`
                : "It's essentially a tie"}
            </div>
            <p className="text-sm text-foreground">
              {winner === "new" ? (
                <>
                  Based on after-tax income, cost of living in {newOffer.city}, and commute costs, the offer at{" "}
                  {newOffer.company} is worth approximately{" "}
                  <span className="font-mono text-emerald-400">{fmtCurrency(delta)}</span> more per year to your
                  daily life. The raw after-tax salary delta is{" "}
                  <span className="font-mono">{fmtCurrency(deltaRaw)}</span>.
                </>
              ) : winner === "current" ? (
                <>
                  Despite the higher gross, the new offer in {newOffer.city} loses approximately{" "}
                  <span className="font-mono text-amber-400">{fmtCurrency(Math.abs(delta))}</span> per year in real
                  purchasing power once cost of living, state taxes ({newOffer.state}), and commute costs are
                  factored in.
                </>
              ) : (
                <>
                  The two offers are within{" "}
                  <span className="font-mono">{fmtCurrency(Math.abs(delta))}</span> per year of each other in real
                  terms. Factor in growth potential, team quality, and equity upside when deciding.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
