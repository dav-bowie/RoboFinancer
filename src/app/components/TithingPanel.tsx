import { useMemo } from "react";
import { Heart, Sparkles } from "lucide-react";
import { fmtCurrency } from "../../lib/calculations";
import type { TakeHomeFlowInput } from "../../lib/cashFlowModel";
import {
  DEFAULT_TITHING_SETTINGS,
  TITHE_RATE_PRESETS,
  TITHING_VERSES,
  calcMonthlyTitheAmount,
  tithingSummary,
  type TithingSettings,
} from "../../lib/tithingModel";
import { RangeSlider } from "./ui/range-slider";
import { CurrencyInput } from "./ui/currency-input";
import {
  ACCENT,
  BudgetPanel,
  HighlightBox,
  InfoCallout,
  PresetChip,
  ProgressRing,
  StatTile,
  currencyInputClass,
} from "./ui/budget-ui";

interface Props {
  settings: TithingSettings;
  onSettingsChange: (settings: TithingSettings) => void;
  takeHome: TakeHomeFlowInput;
  monthlyTithe: number;
  onMonthlyTitheChange: (amount: number) => void;
  monthlySurplus: number;
}

export function TithingPanel({
  settings,
  onSettingsChange,
  takeHome,
  monthlyTithe,
  onMonthlyTitheChange,
  monthlySurplus,
}: Props) {
  const grossMonthly = takeHome.grossSalary / 12;
  const netMonthly = takeHome.netTakeHome / 12;
  const targetMonthly = calcMonthlyTitheAmount(settings, grossMonthly, netMonthly);
  const summary = useMemo(
    () => tithingSummary(settings, takeHome, monthlyTithe, monthlySurplus),
    [settings, takeHome, monthlyTithe, monthlySurplus],
  );
  const verse = TITHING_VERSES[new Date().getMonth() % TITHING_VERSES.length];
  const set = (patch: Partial<TithingSettings>) => onSettingsChange({ ...settings, ...patch });

  return (
    <BudgetPanel
      accent="amber"
      icon={Heart}
      title="Faith & Giving"
      description="Plan tithes and generosity alongside your budget — built for believers who want to give intentionally."
      badge={
        settings.enabled ? (
          <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide ${ACCENT.amber.badge} font-normal`}>
            <Sparkles size={10} /> Active
          </span>
        ) : undefined
      }
      toggle={{
        checked: settings.enabled,
        label: "Enable tithing plan",
        onChange: (enabled) =>
          set({
            enabled,
            ...(enabled ? {} : {}),
            ...(enabled && !settings.ratePct ? { ratePct: DEFAULT_TITHING_SETTINGS.ratePct } : {}),
          }),
      }}
    >
      <div
        className={`grid transition-all duration-500 ease-in-out ${
          settings.enabled ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden min-h-0 space-y-5">
          <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
            <ProgressRing pct={summary.progress.pct} active={settings.enabled} accent="amber" />
            <div className="flex-1 space-y-3">
              <p className="text-sm text-foreground leading-relaxed">{summary.encouragement}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatTile label="Target/mo" value={fmtCurrency(targetMonthly)} accent="amber" />
                <StatTile label="Planned/mo" value={fmtCurrency(monthlyTithe)} />
                <StatTile label="Annual giving" value={fmtCurrency(summary.annualGiving)} />
                <StatTile
                  label="Surplus after"
                  value={`${fmtCurrency(summary.surplusAfterTithe)}/mo`}
                  valueClassName={summary.surplusAfterTithe >= 0 ? "text-emerald-400" : "text-red-400"}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Tithe rate</label>
                <div className="flex flex-wrap gap-2">
                  {TITHE_RATE_PRESETS.map((rate) => (
                    <PresetChip
                      key={rate}
                      label={`${rate}%`}
                      selected={settings.ratePct === rate}
                      onClick={() => set({ ratePct: rate, autoCalculate: true })}
                      accent="amber"
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs text-muted-foreground">Custom rate</label>
                  <span className="font-mono text-xs text-amber-400">{settings.ratePct}%</span>
                </div>
                <RangeSlider
                  min={1}
                  max={20}
                  step={0.5}
                  value={settings.ratePct}
                  onChange={(ratePct) => set({ ratePct, autoCalculate: true })}
                  accentColor={ACCENT.amber.slider}
                  aria-label="Tithe percentage"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Calculate from</label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "gross" as const, label: "Gross income", hint: "Traditional first-fruits" },
                      { id: "net" as const, label: "Net take-home", hint: "After-tax basis" },
                    ] as const
                  ).map(({ id, label, hint }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => set({ basis: id, autoCalculate: true })}
                      className={`text-left rounded-lg border p-3 transition-all duration-200 ${
                        settings.basis === id ? ACCENT.amber.option : ACCENT.amber.optionIdle
                      }`}
                    >
                      <div className="text-xs font-medium text-foreground">{label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>
                      <div className="font-mono text-[11px] text-amber-400/90 mt-1">
                        {fmtCurrency(id === "gross" ? grossMonthly : netMonthly)}/mo
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <HighlightBox accent="amber" kicker={verse.ref}>
                <span className="italic">&ldquo;{verse.text}&rdquo;</span>
              </HighlightBox>

              <div className="rounded-lg border border-border bg-secondary/25 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm text-foreground">Monthly tithe amount</label>
                  <button
                    type="button"
                    onClick={() => set({ autoCalculate: !settings.autoCalculate })}
                    className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded border transition-colors ${
                      settings.autoCalculate
                        ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {settings.autoCalculate ? "Auto" : "Manual"}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                    $
                  </span>
                  <CurrencyInput
                    value={monthlyTithe}
                    onChange={(v) => {
                      onMonthlyTitheChange(v);
                      set({ autoCalculate: false });
                    }}
                    disabled={settings.autoCalculate}
                    min={0}
                    max={999_999}
                    aria-label="Monthly tithe amount"
                    className={`${currencyInputClass("amber")} ${settings.autoCalculate ? "opacity-70 cursor-not-allowed" : ""}`}
                  />
                </div>
                {settings.autoCalculate && (
                  <p className="text-[11px] text-muted-foreground">
                    Auto-calculated as {settings.ratePct}% of {settings.basis === "gross" ? "gross" : "net"} income.
                  </p>
                )}
              </div>

              <InfoCallout title="First-fruits view:">
                Giving flows through your cash diagram before lifestyle spending — so you can see faith and finances
                together.
              </InfoCallout>
            </div>
          </div>
        </div>
      </div>
    </BudgetPanel>
  );
}
