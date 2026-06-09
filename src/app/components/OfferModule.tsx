import { useState, useMemo } from "react";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
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

  const calc = (o: OfferInputs) => {
    const totalComp = o.baseSalary + o.bonus + o.equity;
    const taxBreakdown = calcTakeHome(o.baseSalary + o.bonus, "single", o.state, o.retirementRate);
    const annualCommuteCost = o.commuteCost * 12;
    const annualCommuteTimeHrs = o.commuteHrsWeek * 50;
    const col = COST_OF_LIVING_INDEX[o.city] || 100;
    return { totalComp, taxBreakdown, annualCommuteCost, annualCommuteTimeHrs, col };
  };

  const curr = useMemo(() => calc(current), [current]);
  const next = useMemo(() => calc(newOffer), [newOffer]);

  const currAdjustedTakeHome =
    (curr.taxBreakdown.netTakeHome + current.equity - curr.annualCommuteCost) / (curr.col / 100);
  const nextAdjustedTakeHome =
    (next.taxBreakdown.netTakeHome + newOffer.equity - next.annualCommuteCost) / (next.col / 100);

  const delta = nextAdjustedTakeHome - currAdjustedTakeHome;
  const deltaRaw =
    next.taxBreakdown.netTakeHome + newOffer.equity - curr.taxBreakdown.netTakeHome - current.equity;

  const winner = delta > 5000 ? "new" : delta < -5000 ? "current" : "tie";

  const Row = ({
    label,
    currVal,
    newVal,
    mono = true,
    highlight = false,
  }: {
    label: string;
    currVal: string;
    newVal: string;
    mono?: boolean;
    highlight?: boolean;
  }) => (
    <div
      className={`flex items-center py-2.5 px-4 border-b border-border last:border-0 gap-4 ${
        highlight ? "bg-muted/10" : ""
      }`}
    >
      <div className="text-xs text-muted-foreground w-44 shrink-0">{label}</div>
      <div className={`flex-1 text-right ${mono ? "font-mono" : ""} text-sm text-foreground`}>{currVal}</div>
      <ArrowRight size={12} className="text-muted-foreground shrink-0" />
      <div className={`flex-1 text-left ${mono ? "font-mono" : ""} text-sm text-foreground`}>{newVal}</div>
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

      {/* Comparison */}
      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-xs tracking-widest uppercase text-muted-foreground">Side-by-Side Comparison</span>
        </div>
        <div>
          <Row label="Total Comp (gross)" currVal={fmtCurrency(curr.totalComp)} newVal={fmtCurrency(next.totalComp)} />
          <Row
            label="Net Take-Home (after tax)"
            currVal={fmtCurrency(curr.taxBreakdown.netTakeHome)}
            newVal={fmtCurrency(next.taxBreakdown.netTakeHome)}
          />
          <Row
            label="Annual Commute Cost"
            currVal={`-${fmtCurrency(curr.annualCommuteCost)}`}
            newVal={`-${fmtCurrency(next.annualCommuteCost)}`}
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
          <Row
            label="CoL-Adjusted Take-Home"
            currVal={fmtCurrency(currAdjustedTakeHome)}
            newVal={fmtCurrency(nextAdjustedTakeHome)}
            highlight
          />
        </div>
      </div>

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
                  After accounting for state tax differences, cost of living in {newOffer.city}, and commute costs,
                  the new offer at {newOffer.company} is worth approximately{" "}
                  <span className="font-mono text-emerald-400">{fmtCurrency(delta)}</span> more per year in real
                  purchasing power. The raw after-tax delta is{" "}
                  <span className="font-mono">{fmtCurrency(deltaRaw)}</span>.
                </>
              ) : winner === "current" ? (
                <>
                  Despite the higher gross salary, the new offer in {newOffer.city} loses approximately{" "}
                  <span className="font-mono text-amber-400">{fmtCurrency(Math.abs(delta))}</span> per year
                  in real purchasing power once cost of living, state taxes, and commute costs are factored in.
                </>
              ) : (
                <>
                  The two offers are within{" "}
                  <span className="font-mono">{fmtCurrency(Math.abs(delta))}</span> per year of each other
                  in real terms. Factor in growth potential, team quality, and equity upside when deciding.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
