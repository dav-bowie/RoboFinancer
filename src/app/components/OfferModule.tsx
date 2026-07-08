import { useState, useMemo, useEffect } from "react";
import { ArrowRight, TrendingUp, TrendingDown, Minus, SlidersHorizontal, Link2 } from "lucide-react";
import { toast } from "sonner";
import { calcTakeHome, STATE_OPTIONS, CITIES, COST_OF_LIVING_INDEX, fmtCurrency } from "../../lib/calculations";
import type { OfferComparisonSnapshot, OfferInputsSnapshot } from "../../lib/offerUrlState";
import {
  computeWeightedVerdict,
  COMP_FOCUS_OPTIONS,
  colAffordabilityScore,
  formatHousingRange,
  getHousingPricing,
  WORK_STYLE_LABELS,
  type UserPreferences,
  type WorkStyle,
  type CompFocus,
} from "../../lib/offerScoring";
import { RangeSlider } from "./ui/range-slider";
import { CurrencyInput } from "./ui/currency-input";

interface OfferInputs extends OfferInputsSnapshot {}

interface TaxSettings {
  filingStatus: "single" | "married";
  k401Type: "traditional" | "roth";
  hsaAmount: number;
}

interface Props {
  taxSettings: TaxSettings;
  comparison: OfferComparisonSnapshot;
  onComparisonChange: (snapshot: OfferComparisonSnapshot) => void;
  onGoToTakeHome?: () => void;
  isActive?: boolean;
}

function PreferenceSlider({
  label,
  hint,
  min,
  max,
  step,
  value,
  onChange,
  leftLabel,
  rightLabel,
  displayValue,
}: {
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  leftLabel: string;
  rightLabel: string;
  displayValue?: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="text-xs text-muted-foreground">{label}</label>
        {displayValue && <span className="font-mono text-xs text-foreground">{displayValue}</span>}
      </div>
      <RangeSlider min={min} max={max} step={step} value={value} onChange={onChange} accentColor="#10b981" />
      <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function OptionButtons<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  columns = 3,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3;
}) {
  return (
    <div>
      <label className="block mb-2 text-xs text-muted-foreground">{label}</label>
      <div className={`grid gap-2 ${columns === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`py-2 px-2 rounded border text-xs transition-colors ${
              value === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function HousingLocationCard({
  city,
  company,
  household,
}: {
  city: string;
  company: string;
  household: UserPreferences["household"];
}) {
  const pricing = getHousingPricing(city, household);
  return (
    <div className="rounded border border-border bg-secondary/40 p-3 space-y-2">
      <div className="text-xs text-foreground font-medium">{company}</div>
      <div className="text-[11px] text-muted-foreground">{city}</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Min</div>
          <div className="font-mono text-xs text-foreground">{fmtCurrency(pricing.min)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg</div>
          <div className="font-mono text-xs text-primary">{fmtCurrency(pricing.avg)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Max</div>
          <div className="font-mono text-xs text-foreground">{fmtCurrency(pricing.max)}</div>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground">Estimated monthly rent · {household === "couple" ? "2BR" : "1BR"}</div>
    </div>
  );
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

      <div>
        <label className="block mb-2 text-xs text-muted-foreground">Work Arrangement</label>
        <div className="grid grid-cols-3 gap-2">
          {(["remote", "hybrid", "in_office"] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onChange({ workStyle: style })}
              className={`py-2 px-2 rounded border text-xs transition-colors ${
                offer.workStyle === style
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {WORK_STYLE_LABELS[style]}
            </button>
          ))}
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
            <CurrencyInput
              value={offer[key] as number}
              onChange={(v) => onChange({ [key]: v })}
              min={0}
              max={5_000_000}
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
        <RangeSlider
          min={0}
          max={23}
          step={1}
          value={offer.retirementRate}
          onChange={(retirementRate) => onChange({ retirementRate })}
          accentColor="#10b981"
          aria-label="401(k) contribution rate"
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

export function OfferModule({ taxSettings, comparison, onComparisonChange, onGoToTakeHome, isActive = true }: Props) {
  const { current, newOffer, prefs } = comparison;
  const setCurrent = (patch: Partial<OfferInputs>) =>
    onComparisonChange({ ...comparison, current: { ...current, ...patch } });
  const setNewOffer = (patch: Partial<OfferInputs>) =>
    onComparisonChange({ ...comparison, newOffer: { ...newOffer, ...patch } });
  const setPrefs = (updater: UserPreferences | ((p: UserPreferences) => UserPreferences)) => {
    const next = typeof updater === "function" ? updater(prefs) : updater;
    onComparisonChange({ ...comparison, prefs: next });
  };

  const [showPrefs, setShowPrefs] = useState(true);

  const currAffordability = colAffordabilityScore(current.city);
  const nextAffordability = colAffordabilityScore(newOffer.city);

  const calc = (o: OfferInputs) => {
    const totalComp = o.baseSalary + o.bonus + o.equity;
    const taxBreakdown = calcTakeHome(
      o.baseSalary + o.bonus,
      taxSettings.filingStatus,
      o.state,
      o.retirementRate,
      taxSettings.k401Type,
      taxSettings.hsaAmount,
    );
    const annualCommuteCost = o.commuteCost * 12;
    const annualCommuteTimeHrs = o.commuteHrsWeek * 50;
    const col = COST_OF_LIVING_INDEX[o.city] || 100;
    const trueAnnual = taxBreakdown.netTakeHome + o.equity - annualCommuteCost;
    const adjustedTakeHome = trueAnnual / (col / 100);
    return { totalComp, taxBreakdown, annualCommuteCost, annualCommuteTimeHrs, col, trueAnnual, adjustedTakeHome };
  };

  const curr = useMemo(() => calc(current), [current, taxSettings]);
  const next = useMemo(() => calc(newOffer), [newOffer, taxSettings]);

  const impliedHourlyRate = Math.round(
    ((curr.taxBreakdown.netTakeHome + next.taxBreakdown.netTakeHome) / 2) / 2000,
  );

  const verdict = useMemo(
    () =>
      computeWeightedVerdict(
        {
          company: current.company,
          city: current.city,
          baseSalary: current.baseSalary,
          bonus: current.bonus,
          equity: current.equity,
          retirementRate: current.retirementRate,
          commuteCost: current.commuteCost,
          commuteHrsWeek: current.commuteHrsWeek,
          workStyle: current.workStyle,
          adjustedTakeHome: curr.adjustedTakeHome,
          netTakeHome: curr.taxBreakdown.netTakeHome,
          annualCommuteCost: curr.annualCommuteCost,
          annualCommuteTimeHrs: curr.annualCommuteTimeHrs,
          colIndex: curr.col,
        },
        {
          company: newOffer.company,
          city: newOffer.city,
          baseSalary: newOffer.baseSalary,
          bonus: newOffer.bonus,
          equity: newOffer.equity,
          retirementRate: newOffer.retirementRate,
          commuteCost: newOffer.commuteCost,
          commuteHrsWeek: newOffer.commuteHrsWeek,
          workStyle: newOffer.workStyle,
          adjustedTakeHome: next.adjustedTakeHome,
          netTakeHome: next.taxBreakdown.netTakeHome,
          annualCommuteCost: next.annualCommuteCost,
          annualCommuteTimeHrs: next.annualCommuteTimeHrs,
          colIndex: next.col,
        },
        prefs,
        impliedHourlyRate,
      ),
    [current, newOffer, curr, next, prefs, impliedHourlyRate],
  );

  const { winner, weightedScore, dimensions, summary, rawFinancialDelta } = verdict;
  const deltaRaw =
    next.taxBreakdown.netTakeHome + newOffer.equity - curr.taxBreakdown.netTakeHome - current.equity;

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
      <div className={`flex-1 text-right ${mono ? "font-mono" : ""} text-sm ${currColor ?? "text-foreground"}`}>
        {currVal}
      </div>
      <ArrowRight size={12} className="text-muted-foreground shrink-0" />
      <div className={`flex-1 text-left ${mono ? "font-mono" : ""} text-sm ${newColor ?? "text-foreground"}`}>
        {newVal}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 flex items-start gap-2">
        <Link2 size={14} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tax estimates use your{" "}
          <span className="text-foreground">Take-Home</span> settings:{" "}
          <span className="font-mono text-foreground">
            {taxSettings.filingStatus === "married" ? "Married" : "Single"}
          </span>
          ,{" "}
          <span className="font-mono text-foreground">
            {taxSettings.k401Type === "roth" ? "Roth 401(k)" : "Traditional 401(k)"}
          </span>
          {taxSettings.hsaAmount > 0 && (
            <>
              , HSA <span className="font-mono text-foreground">{fmtCurrency(taxSettings.hsaAmount)}/yr</span>
            </>
          )}
          .{" "}
          {onGoToTakeHome ? (
            <button type="button" onClick={onGoToTakeHome} className="text-primary hover:underline">
              Update them on the Take-Home tab
            </button>
          ) : (
            <>Update them on the Take-Home tab</>
          )}{" "}
          to change offer tax math.
        </p>
      </div>

      <div className="rounded border border-border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPrefs((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-secondary/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-primary" />
            <span className="text-xs tracking-widest uppercase text-muted-foreground">Your Preferences & Lifestyle</span>
          </div>
          <span className="text-xs text-muted-foreground">{showPrefs ? "Hide" : "Show"}</span>
        </button>

        {showPrefs && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-5">
            <OptionButtons<CompFocus>
              label="Cash now vs. long-term upside"
              options={COMP_FOCUS_OPTIONS.map(({ value, label }) => ({ value, label }))}
              value={prefs.compFocus}
              onChange={(compFocus) => setPrefs((p) => ({ ...p, compFocus }))}
              hint={COMP_FOCUS_OPTIONS.find((o) => o.value === prefs.compFocus)?.hint}
            />

            <OptionButtons<WorkStyle>
              label="Work preference"
              options={(["remote", "hybrid", "in_office"] as const).map((value) => ({
                value,
                label: WORK_STYLE_LABELS[value],
              }))}
              value={prefs.workPreference}
              onChange={(workPreference) => setPrefs((p) => ({ ...p, workPreference }))}
              hint="How well each offer matches your preferred work arrangement."
            />

            <PreferenceSlider
              label="Income stability priority"
              min={0}
              max={100}
              step={5}
              value={prefs.financialStability}
              onChange={(financialStability) => setPrefs((p) => ({ ...p, financialStability }))}
              leftLabel="Flexible"
              rightLabel="Stability-first"
              displayValue={`${prefs.financialStability}%`}
            />
            <PreferenceSlider
              label="Commute importance"
              min={0}
              max={100}
              step={5}
              value={prefs.commuteImportance}
              onChange={(commuteImportance) => setPrefs((p) => ({ ...p, commuteImportance }))}
              leftLabel="Don't care much"
              rightLabel="Very important"
              displayValue={`${prefs.commuteImportance}%`}
            />

            <div className="md:col-span-2 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="text-xs text-muted-foreground">Housing by location</label>
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  {(["single", "couple"] as const).map((household) => (
                    <button
                      key={household}
                      type="button"
                      onClick={() => setPrefs((p) => ({ ...p, household }))}
                      className={`py-1.5 px-3 rounded border text-xs transition-colors ${
                        prefs.household === household
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {household === "single" ? "1BR" : "2BR"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <HousingLocationCard city={current.city} company={current.company} household={prefs.household} />
                <HousingLocationCard city={newOffer.city} company={newOffer.company} household={prefs.household} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Rent ranges are estimated from each city&apos;s cost-of-living index and used automatically in your recommendation.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OfferColumn offer={current} onChange={(u) => setCurrent((p) => ({ ...p, ...u }))} label="Current Role" />
        <OfferColumn offer={newOffer} onChange={(u) => setNewOffer((p) => ({ ...p, ...u }))} label="New Offer" />
      </div>

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
            label="Work Arrangement"
            currVal={WORK_STYLE_LABELS[current.workStyle]}
            newVal={WORK_STYLE_LABELS[newOffer.workStyle]}
            mono={false}
          />
          <Row
            label="Est. Monthly Rent"
            currVal={formatHousingRange(getHousingPricing(current.city, prefs.household))}
            newVal={formatHousingRange(getHousingPricing(newOffer.city, prefs.household))}
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
          <Row label="Cost of Living Index" currVal={`${curr.col}`} newVal={`${next.col}`} />
          <Row
            label="Affordability Score"
            currVal={`${currAffordability}/10`}
            newVal={`${nextAffordability}/10`}
            mono={false}
          />
          <Row
            label="CoL-Adjusted Take-Home"
            currVal={fmtCurrency(curr.adjustedTakeHome)}
            newVal={fmtCurrency(next.adjustedTakeHome)}
            highlight
          />
          <Row
            label="Financial Δ (unweighted)"
            currVal="—"
            newVal={`${rawFinancialDelta >= 0 ? "+" : ""}${fmtCurrency(rawFinancialDelta)}`}
            newColor={
              rawFinancialDelta > 5000 ? "text-emerald-400" : rawFinancialDelta < -5000 ? "text-red-400" : "text-muted-foreground"
            }
          />
        </div>
      </div>

      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-xs tracking-widest uppercase text-muted-foreground">Weighted Score Breakdown</span>
        </div>
        <div className="divide-y divide-border">
          {dimensions.map((d) => (
            <div key={d.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="sm:w-44 shrink-0">
                <div className="text-xs text-foreground">{d.label}</div>
                <div className="text-[11px] text-muted-foreground">{Math.round(d.weight * 100)}% weight</div>
              </div>
              <div className="flex-1">
                <div className="h-2 rounded-full bg-secondary border border-border overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      d.score > 0 ? "bg-emerald-500" : d.score < 0 ? "bg-amber-500" : "bg-muted-foreground/40"
                    }`}
                    style={{ width: `${Math.min(100, Math.abs(d.score))}%`, marginLeft: d.score < 0 ? `${100 - Math.min(100, Math.abs(d.score))}%` : 0 }}
                  />
                </div>
              </div>
              <div
                className={`text-xs font-mono shrink-0 ${
                  d.favors === "new" ? "text-emerald-400" : d.favors === "current" ? "text-amber-400" : "text-muted-foreground"
                }`}
              >
                {d.score >= 0 ? "+" : ""}
                {Math.round(d.score)} → {d.favors === "new" ? newOffer.company : d.favors === "current" ? current.company : "neutral"}
              </div>
              <p className="text-[11px] text-muted-foreground sm:basis-full">{d.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {(curr.annualCommuteTimeHrs > 0 || next.annualCommuteTimeHrs > 0) && (
        <div className="rounded border border-border bg-secondary/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Commute time cost: </span>
            At your implied hourly rate of ~${impliedHourlyRate}/hr, {current.company}&apos;s {curr.annualCommuteTimeHrs}{" "}
            hrs/yr of commute costs an additional{" "}
            <span className="font-mono text-foreground">{fmtCurrency(curr.annualCommuteTimeHrs * impliedHourlyRate)}</span> in
            time value. {newOffer.company}&apos;s commute costs{" "}
            <span className="font-mono text-foreground">{fmtCurrency(next.annualCommuteTimeHrs * impliedHourlyRate)}</span>.
            {prefs.commuteImportance >= 50 && " This is factored into your weighted recommendation."}
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Affordability scores are estimated from each city&apos;s cost-of-living index (10 = most affordable).</span>
      </div>

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
                winner === "new" ? "text-emerald-400" : winner === "current" ? "text-amber-400" : "text-muted-foreground"
              }`}
            >
              {winner === "new"
                ? `Take the offer at ${newOffer.company}`
                : winner === "current"
                  ? `Stay at ${current.company}`
                  : "It's essentially a tie for your profile"}
            </div>
            <p className="text-sm text-foreground mb-2">{summary}</p>
            <p className="text-xs text-muted-foreground">
              Weighted score:{" "}
              <span className="font-mono text-foreground">
                {weightedScore >= 0 ? "+" : ""}
                {Math.round(weightedScore)}
              </span>{" "}
              (positive favors {newOffer.company}). Raw financial delta:{" "}
              <span className="font-mono">{fmtCurrency(rawFinancialDelta)}</span> · After-tax salary+equity delta:{" "}
              <span className="font-mono">{fmtCurrency(deltaRaw)}</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
