import { fmtCurrency } from "../../lib/calculations";
import { CurrencyInput } from "./ui/currency-input";

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  /** Compact row layout for tight spaces */
  variant?: "card" | "row";
}

const inputClassName =
  "w-full min-w-0 bg-background border border-border rounded-md px-3 py-2.5 pl-7 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 selection:bg-primary/20 selection:text-foreground";

export function BudgetLineItemEditor({ label, value, onChange, hint, variant = "card" }: Props) {
  if (variant === "row") {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label className="text-sm text-foreground sm:w-44 shrink-0 leading-snug">{label}</label>
        <div className="relative flex-1 min-w-[8rem] max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>
          <CurrencyInput
            value={value}
            onChange={onChange}
            min={0}
            max={999_999}
            aria-label={`${label} monthly amount`}
            className={inputClassName}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <span className="text-xs text-muted-foreground font-mono sm:w-24 sm:text-right shrink-0">
          {fmtCurrency(value * 12)}/yr
        </span>
        {hint && <span className="sr-only">{hint}</span>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/70 bg-secondary/25 p-3 space-y-2 hover:border-border transition-colors">
      <label className="block text-sm text-foreground leading-snug">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>
        <CurrencyInput
          value={value}
          onChange={onChange}
          min={0}
          max={999_999}
          aria-label={`${label} monthly amount`}
          className={inputClassName}
          onFocus={(e) => e.target.select()}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Monthly</span>
        <span className="font-mono">{fmtCurrency(value * 12)}/yr</span>
      </div>
      {hint && <span className="sr-only">{hint}</span>}
    </div>
  );
}
