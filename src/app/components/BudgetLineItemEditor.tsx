import { fmtCurrency } from "../../lib/calculations";

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}

export function BudgetLineItemEditor({ label, value, onChange, hint }: Props) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-muted-foreground w-40 shrink-0 leading-tight">{label}</label>
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
        <input
          type="number"
          min={0}
          step={10}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full bg-secondary border border-border rounded px-3 py-2 pl-6 text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <span className="text-[10px] text-muted-foreground font-mono w-16 text-right shrink-0 hidden sm:block">
        {fmtCurrency(value * 12)}/yr
      </span>
      {hint && <span className="sr-only">{hint}</span>}
    </div>
  );
}
