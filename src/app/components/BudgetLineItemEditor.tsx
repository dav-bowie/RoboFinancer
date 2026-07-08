import { fmtCurrency } from "../../lib/calculations";
import { CurrencyInput } from "./ui/currency-input";
import { ACCENT, currencyInputClass, type BudgetAccent } from "./ui/budget-ui";

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  variant?: "card" | "row";
  accent?: BudgetAccent;
}

export function BudgetLineItemEditor({
  label,
  value,
  onChange,
  hint,
  variant = "card",
  accent = "emerald",
}: Props) {
  const inputClass = `${currencyInputClass(accent)} selection:bg-primary/20 selection:text-foreground`;
  const a = ACCENT[accent];

  if (variant === "row") {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5">
        <label className="text-sm text-foreground sm:w-44 shrink-0 leading-snug">{label}</label>
        <div className="relative flex-1 min-w-[8rem] max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>
          <CurrencyInput
            value={value}
            onChange={onChange}
            min={0}
            max={999_999}
            aria-label={`${label} monthly amount`}
            className={inputClass}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <span className={`text-xs font-mono sm:w-24 sm:text-right shrink-0 ${a.stat}`}>{fmtCurrency(value * 12)}/yr</span>
        {hint && <span className="sr-only">{hint}</span>}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${a.border} bg-gradient-to-br ${a.panel} to-transparent p-3 space-y-2 transition-all duration-200 hover:border-opacity-100`}>
      <label className="block text-sm text-foreground leading-snug">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>
        <CurrencyInput
          value={value}
          onChange={onChange}
          min={0}
          max={999_999}
          aria-label={`${label} monthly amount`}
          className={inputClass}
          onFocus={(e) => e.target.select()}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Monthly</span>
        <span className={`font-mono ${a.stat}`}>{fmtCurrency(value * 12)}/yr</span>
      </div>
      {hint && <span className="sr-only">{hint}</span>}
    </div>
  );
}
