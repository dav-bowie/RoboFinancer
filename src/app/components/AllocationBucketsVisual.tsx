import { fmtCurrency } from "../../lib/calculations";
import type { AllocationBucket, AllocationPlan, AllocationPreferences } from "../../lib/allocationModel";
import { SAVINGS_GOAL_OPTIONS } from "../../lib/allocationModel";
import { RangeSlider } from "./ui/range-slider";
import { Check, ArrowRight } from "lucide-react";

interface Props {
  plan: AllocationPlan;
  prefs: AllocationPreferences;
  onPrefsChange: (prefs: AllocationPreferences) => void;
  onApplySuggestions?: () => void;
  applied?: boolean;
}

function FunnelBucket({ bucket, maxMonthly }: { bucket: AllocationBucket; maxMonthly: number }) {
  const fillPct = Math.round(bucket.progress * 100);
  const monthlyWidth =
    maxMonthly > 0 ? Math.max(8, (bucket.recommendedMonthly / maxMonthly) * 100) : 0;
  const actualWidth =
    maxMonthly > 0 ? Math.max(4, (bucket.actualMonthly / maxMonthly) * 100) : 0;

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        bucket.recommended
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: bucket.color }} />
            <span className="text-sm font-medium text-foreground">{bucket.label}</span>
            {bucket.recommended && (
              <span className="text-[10px] uppercase tracking-wide text-primary border border-primary/30 rounded px-1.5 py-0.5">
                Recommended
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{bucket.description}</p>
          {bucket.note && <p className="text-[10px] text-muted-foreground mt-0.5">{bucket.note}</p>}
        </div>
      </div>

      {/* Funnel visual */}
      <div className="relative mb-3">
        <div className="flex flex-col items-center">
          <div
            className="h-3 rounded-t-full border border-b-0 border-border bg-secondary/60 transition-all duration-500"
            style={{
              width: `${Math.min(100, monthlyWidth + 20)}%`,
              borderColor: bucket.recommended ? bucket.color : undefined,
              background: bucket.recommended ? `${bucket.color}22` : undefined,
            }}
          />
          <div
            className="h-16 rounded-b-lg border border-border overflow-hidden relative w-full max-w-[200px] mx-auto"
            style={{ borderColor: `${bucket.color}44` }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 transition-all duration-700 rounded-b-lg"
              style={{
                height: `${fillPct}%`,
                background: `linear-gradient(to top, ${bucket.color}88, ${bucket.color}33)`,
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-sm text-foreground">{fillPct}%</span>
              <span className="text-[10px] text-muted-foreground">of target</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded border border-border/60 bg-secondary/30 px-2 py-1.5">
          <div className="text-[10px] text-muted-foreground">Balance</div>
          <div className="font-mono text-xs text-foreground">{fmtCurrency(bucket.currentBalance)}</div>
        </div>
        <div className="rounded border border-border/60 bg-secondary/30 px-2 py-1.5">
          <div className="text-[10px] text-muted-foreground">Target</div>
          <div className="font-mono text-xs text-foreground">{fmtCurrency(bucket.targetBalance)}</div>
        </div>
        <div className="rounded border border-border/60 bg-secondary/30 px-2 py-1.5">
          <div className="text-[10px] text-muted-foreground">You contribute</div>
          <div className="font-mono text-xs" style={{ color: bucket.color }}>
            {fmtCurrency(bucket.actualMonthly)}/mo
          </div>
        </div>
        <div className="rounded border border-border/60 bg-secondary/30 px-2 py-1.5">
          <div className="text-[10px] text-muted-foreground">Suggested</div>
          <div className="font-mono text-xs text-primary">{fmtCurrency(bucket.recommendedMonthly)}/mo</div>
        </div>
      </div>

      {bucket.actualMonthly > 0 && (
        <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full opacity-60"
            style={{ width: `${actualWidth}%`, background: bucket.color }}
          />
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
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div>
          <label className="text-xs tracking-widest uppercase text-muted-foreground">
            Your Savings Goal
          </label>
          <p className="text-[11px] text-muted-foreground mt-1">
            Choose how to prioritize buckets — recommendations update based on your preference.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SAVINGS_GOAL_OPTIONS.map(({ value, label, hint }) => (
            <button
              key={value}
              type="button"
              onClick={() => onPrefsChange({ ...prefs, savingsGoal: value })}
              className={`text-left rounded-lg border p-3 transition-colors ${
                prefs.savingsGoal === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="text-xs font-medium">{label}</div>
              <div className="text-[10px] mt-1 opacity-80 leading-relaxed">{hint}</div>
            </button>
          ))}
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs text-muted-foreground">Emergency fund coverage</label>
            <span className="font-mono text-xs text-foreground">{prefs.emergencyFundMonths} months</span>
          </div>
          <RangeSlider
            min={3}
            max={12}
            step={1}
            value={prefs.emergencyFundMonths}
            onChange={(emergencyFundMonths) => onPrefsChange({ ...prefs, emergencyFundMonths })}
            accentColor="#0ea5e9"
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            Monthly essentials
          </div>
          <div className="font-mono text-lg text-foreground">{fmtCurrency(plan.monthlyEssentialSpending)}</div>
          <div className="text-[10px] text-muted-foreground">× 12 = emergency baseline</div>
        </div>
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            Emergency fund target
          </div>
          <div className="font-mono text-lg text-sky-400">{fmtCurrency(plan.emergencyFundTarget)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            Monthly savings pool
          </div>
          <div className="font-mono text-lg text-emerald-400">{fmtCurrency(plan.monthlySavingsPool)}</div>
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="text-xs text-primary font-medium mb-1">Recommendation</div>
            <p className="text-sm text-foreground">{plan.topRecommendation}</p>
            <p className="text-xs text-muted-foreground mt-2">{plan.summary}</p>
          </div>
          {onApplySuggestions && (
            <button
              type="button"
              onClick={onApplySuggestions}
              className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
                applied
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {applied ? <Check size={14} /> : <ArrowRight size={14} />}
              {applied ? "Applied to Flow Diagram" : "Apply suggestions to budget"}
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Applies suggested monthly amounts to High-Yield Savings, Roth IRA, and Brokerage in the Flow Diagram.
          401(k) and HSA stay synced from Take-Home.
        </p>
      </div>

      {/* Funnel flow header */}
      <div className="text-center py-2">
        <div className="inline-flex flex-col items-center">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
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
