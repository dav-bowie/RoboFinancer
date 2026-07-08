import { fmtCurrency } from "../../lib/calculations";
import type { AllocationBucket, AllocationPlan, AllocationPreferences } from "../../lib/allocationModel";
import { SAVINGS_GOAL_OPTIONS } from "../../lib/allocationModel";
import { RangeSlider } from "./ui/range-slider";
import { Check, ArrowRight, PiggyBank, Target } from "lucide-react";
import {
  ACCENT,
  BudgetPanel,
  InfoCallout,
  OptionCard,
  ProgressRing,
  StatTile,
} from "./ui/budget-ui";

interface Props {
  plan: AllocationPlan;
  prefs: AllocationPreferences;
  onPrefsChange: (prefs: AllocationPreferences) => void;
  onApplySuggestions?: () => void;
  applied?: boolean;
}

function FunnelBucket({ bucket, maxMonthly }: { bucket: AllocationBucket; maxMonthly: number }) {
  const fillPct = Math.round(bucket.progress * 100);
  const overTarget = bucket.targetBalance > 0 && bucket.currentBalance > bucket.targetBalance;
  const actualWidth =
    maxMonthly > 0 ? Math.max(4, (bucket.actualMonthly / maxMonthly) * 100) : 0;

  return (
    <div
      className={`flex flex-col h-full rounded-xl border p-4 transition-all duration-300 ${
        bucket.recommended
          ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.08] via-card to-card ring-1 ring-emerald-500/20 shadow-[0_0_32px_-12px_rgba(16,185,129,0.25)]"
          : "border-border bg-card/60"
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        <ProgressRing
          pct={fillPct}
          active={bucket.recommended || fillPct > 0}
          accent={bucket.recommended ? "emerald" : "sky"}
          size="sm"
          sublabel={overTarget ? "above" : "of target"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: bucket.color }} />
            <span className="text-sm font-medium text-foreground">{bucket.label}</span>
            {bucket.recommended && (
              <span className="text-[10px] uppercase tracking-wide text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5">
                Recommended
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{bucket.description}</p>
          {bucket.note && <p className="text-[10px] text-muted-foreground mt-0.5">{bucket.note}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center mb-2">
        <StatTile label="Balance" value={fmtCurrency(bucket.currentBalance)} />
        <StatTile label="Target" value={fmtCurrency(bucket.targetBalance)} />
        <StatTile label="You contribute" value={`${fmtCurrency(bucket.actualMonthly)}/mo`} accent="emerald" />
        <StatTile label="Suggested" value={`${fmtCurrency(bucket.recommendedMonthly)}/mo`} accent="sky" />
      </div>

      {bucket.actualMonthly > 0 && (
        <div className="mt-auto pt-2">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Your monthly share</span>
            <span className="font-mono">{fmtCurrency(bucket.actualMonthly)}/mo</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${actualWidth}%`, background: bucket.color }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function AllocationBucketsVisual({ plan, prefs, onPrefsChange, onApplySuggestions, applied }: Props) {
  const maxMonthly = Math.max(
    ...plan.buckets.map((b) => Math.max(b.recommendedMonthly, b.actualMonthly)),
    1,
  );

  return (
    <div className="space-y-5">
      <BudgetPanel
        accent="emerald"
        icon={Target}
        title="Your Savings Goal"
        description="Choose how to prioritize buckets — recommendations update based on your preference."
      >
        <div className="space-y-5 pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SAVINGS_GOAL_OPTIONS.map(({ value, label, hint }) => (
              <OptionCard
                key={value}
                label={label}
                hint={hint}
                selected={prefs.savingsGoal === value}
                onClick={() => onPrefsChange({ ...prefs, savingsGoal: value })}
                accent="emerald"
              />
            ))}
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-xs text-muted-foreground">Emergency fund coverage</label>
              <span className="font-mono text-xs text-sky-400">{prefs.emergencyFundMonths} months</span>
            </div>
            <RangeSlider
              min={3}
              max={12}
              step={1}
              value={prefs.emergencyFundMonths}
              onChange={(emergencyFundMonths) => onPrefsChange({ ...prefs, emergencyFundMonths })}
              accentColor={ACCENT.sky.slider}
              aria-label="Emergency fund months of expenses"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
              <span>3 mo</span>
              <span>
                Target: {fmtCurrency(plan.emergencyFundTarget)} ({fmtCurrency(plan.monthlyEssentialSpending)}/mo ×{" "}
                {prefs.emergencyFundMonths})
              </span>
              <span>12 mo</span>
            </div>
          </div>
        </div>
      </BudgetPanel>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <StatTile label="Monthly essentials" value={fmtCurrency(plan.monthlyEssentialSpending)} accent="indigo" />
        <StatTile label="Emergency fund target" value={fmtCurrency(plan.emergencyFundTarget)} accent="sky" />
        <StatTile label="Monthly savings pool" value={`${fmtCurrency(plan.monthlySavingsPool)}/mo`} accent="emerald" />
      </div>

      <BudgetPanel
        accent="emerald"
        icon={PiggyBank}
        title="Recommendation"
        description={plan.summary}
        headerExtra={
          onApplySuggestions ? (
            <button
              type="button"
              onClick={onApplySuggestions}
              className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all duration-200 ${
                applied
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              }`}
            >
              {applied ? <Check size={14} /> : <ArrowRight size={14} />}
              {applied ? "Applied" : "Apply to budget"}
            </button>
          ) : undefined
        }
      >
        <p className="text-sm text-foreground leading-relaxed pt-5">{plan.topRecommendation}</p>
        <InfoCallout title="Note:">
          Applies suggested amounts to High-Yield Savings, Roth IRA, and Brokerage. 401(k) and HSA stay synced from
          Take-Home.
        </InfoCallout>
      </BudgetPanel>

      <div className="text-center py-2">
        <div className="inline-flex flex-col items-center">
          <div className="rounded-xl border border-emerald-500/35 bg-gradient-to-br from-emerald-500/[0.1] to-transparent px-5 py-3 shadow-[0_0_32px_-12px_rgba(16,185,129,0.3)]">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Available to allocate</div>
            <div className="font-mono text-xl text-emerald-400">{fmtCurrency(plan.monthlySavingsPool)}/mo</div>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="text-[10px] text-muted-foreground">flows into buckets below</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plan.buckets.map((bucket) => (
          <FunnelBucket key={bucket.id} bucket={bucket} maxMonthly={maxMonthly} />
        ))}
      </div>
    </div>
  );
}
