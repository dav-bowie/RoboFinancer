import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type BudgetAccent = "emerald" | "amber" | "sky" | "indigo" | "violet" | "rose";

export const ACCENT: Record<
  BudgetAccent,
  {
    border: string;
    borderActive: string;
    panel: string;
    iconBg: string;
    iconText: string;
    chip: string;
    chipIdle: string;
    option: string;
    optionIdle: string;
    stat: string;
    badge: string;
    slider: string;
    shadow: string;
    divider: string;
    focusRing: string;
  }
> = {
  emerald: {
    border: "border-emerald-500/35",
    borderActive: "border-emerald-500/50",
    panel: "from-emerald-500/[0.08]",
    iconBg: "bg-emerald-500/15",
    iconText: "text-emerald-400",
    chip: "border-emerald-500/60 bg-emerald-500/15 text-emerald-300",
    chipIdle: "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
    option: "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20",
    optionIdle: "border-border bg-secondary/40 hover:bg-secondary/70",
    stat: "text-emerald-400",
    badge: "text-emerald-400/90",
    slider: "#10b981",
    shadow: "shadow-[0_0_40px_-12px_rgba(16,185,129,0.35)]",
    divider: "border-emerald-500/15",
    focusRing: "focus:border-emerald-500 focus:ring-emerald-500/25",
  },
  amber: {
    border: "border-amber-500/35",
    borderActive: "border-amber-500/50",
    panel: "from-amber-500/[0.08]",
    iconBg: "bg-amber-500/15",
    iconText: "text-amber-400",
    chip: "border-amber-500/60 bg-amber-500/15 text-amber-300",
    chipIdle: "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
    option: "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/20",
    optionIdle: "border-border bg-secondary/40 hover:bg-secondary/70",
    stat: "text-amber-400",
    badge: "text-amber-400/90",
    slider: "#f59e0b",
    shadow: "shadow-[0_0_40px_-12px_rgba(245,158,11,0.35)]",
    divider: "border-amber-500/15",
    focusRing: "focus:border-amber-500 focus:ring-amber-500/25",
  },
  sky: {
    border: "border-sky-500/35",
    borderActive: "border-sky-500/50",
    panel: "from-sky-500/[0.08]",
    iconBg: "bg-sky-500/15",
    iconText: "text-sky-400",
    chip: "border-sky-500/60 bg-sky-500/15 text-sky-300",
    chipIdle: "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
    option: "border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/20",
    optionIdle: "border-border bg-secondary/40 hover:bg-secondary/70",
    stat: "text-sky-400",
    badge: "text-sky-400/90",
    slider: "#0ea5e9",
    shadow: "shadow-[0_0_40px_-12px_rgba(14,165,233,0.35)]",
    divider: "border-sky-500/15",
    focusRing: "focus:border-sky-500 focus:ring-sky-500/25",
  },
  indigo: {
    border: "border-indigo-500/35",
    borderActive: "border-indigo-500/50",
    panel: "from-indigo-500/[0.08]",
    iconBg: "bg-indigo-500/15",
    iconText: "text-indigo-400",
    chip: "border-indigo-500/60 bg-indigo-500/15 text-indigo-300",
    chipIdle: "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
    option: "border-indigo-500/50 bg-indigo-500/10 ring-1 ring-indigo-500/20",
    optionIdle: "border-border bg-secondary/40 hover:bg-secondary/70",
    stat: "text-indigo-400",
    badge: "text-indigo-400/90",
    slider: "#6366f1",
    shadow: "shadow-[0_0_40px_-12px_rgba(99,102,241,0.35)]",
    divider: "border-indigo-500/15",
    focusRing: "focus:border-indigo-500 focus:ring-indigo-500/25",
  },
  violet: {
    border: "border-violet-500/35",
    borderActive: "border-violet-500/50",
    panel: "from-violet-500/[0.08]",
    iconBg: "bg-violet-500/15",
    iconText: "text-violet-400",
    chip: "border-violet-500/60 bg-violet-500/15 text-violet-300",
    chipIdle: "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
    option: "border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/20",
    optionIdle: "border-border bg-secondary/40 hover:bg-secondary/70",
    stat: "text-violet-400",
    badge: "text-violet-400/90",
    slider: "#8b5cf6",
    shadow: "shadow-[0_0_40px_-12px_rgba(139,92,246,0.35)]",
    divider: "border-violet-500/15",
    focusRing: "focus:border-violet-500 focus:ring-violet-500/25",
  },
  rose: {
    border: "border-rose-500/35",
    borderActive: "border-rose-500/50",
    panel: "from-rose-500/[0.08]",
    iconBg: "bg-rose-500/15",
    iconText: "text-rose-400",
    chip: "border-rose-500/60 bg-rose-500/15 text-rose-300",
    chipIdle: "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
    option: "border-rose-500/50 bg-rose-500/10 ring-1 ring-rose-500/20",
    optionIdle: "border-border bg-secondary/40 hover:bg-secondary/70",
    stat: "text-rose-400",
    badge: "text-rose-400/90",
    slider: "#f43f5e",
    shadow: "shadow-[0_0_40px_-12px_rgba(244,63,94,0.35)]",
    divider: "border-rose-500/15",
    focusRing: "focus:border-rose-500 focus:ring-rose-500/25",
  },
};

export function ProgressRing({
  pct,
  active,
  accent = "emerald",
  size = "md",
  sublabel = "of goal",
}: {
  pct: number;
  active?: boolean;
  accent?: BudgetAccent;
  size?: "sm" | "md";
  sublabel?: string;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = ACCENT[accent].slider;
  const dim = size === "sm" ? "w-20 h-20" : "w-28 h-28";
  const inset = size === "sm" ? "inset-[5px]" : "inset-[6px]";
  const textSize = size === "sm" ? "text-lg" : "text-2xl";

  return (
    <div className={`relative ${dim} shrink-0`}>
      <div
        className="absolute inset-0 rounded-full transition-all duration-700 ease-out"
        style={{
          background: active
            ? `conic-gradient(${color} ${clamped * 3.6}deg, ${color}22 0deg)`
            : "conic-gradient(rgba(161,161,170,0.2) 360deg)",
        }}
      />
      <div className={`absolute ${inset} rounded-full bg-card border border-border flex flex-col items-center justify-center`}>
        <span className={`font-mono ${textSize} text-foreground tabular-nums`}>{clamped}%</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{sublabel}</span>
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  accent,
  valueClassName,
}: {
  label: string;
  value: string;
  accent?: BudgetAccent;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/50 px-3 py-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`font-mono text-sm mt-0.5 ${accent ? ACCENT[accent].stat : "text-foreground"} ${valueClassName ?? ""}`}>
        {value}
      </div>
    </div>
  );
}

export function PresetChip({
  label,
  selected,
  onClick,
  accent = "emerald",
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  accent?: BudgetAccent;
}) {
  const a = ACCENT[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg border text-sm font-mono transition-all duration-200 ${
        selected ? `${a.chip} scale-[1.02]` : a.chipIdle
      }`}
    >
      {label}
    </button>
  );
}

export function OptionCard({
  label,
  hint,
  detail,
  selected,
  onClick,
  accent = "emerald",
}: {
  label: string;
  hint?: string;
  detail?: string;
  selected: boolean;
  onClick: () => void;
  accent?: BudgetAccent;
}) {
  const a = ACCENT[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border p-3 transition-all duration-200 ${selected ? a.option : a.optionIdle}`}
    >
      <div className="text-xs font-medium text-foreground">{label}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
      {detail && <div className={`font-mono text-[11px] mt-1 ${a.stat}`}>{detail}</div>}
    </button>
  );
}

export function InfoCallout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border/80 px-3 py-2.5 text-[11px] text-muted-foreground leading-relaxed">
      {title && <span className="text-foreground font-medium">{title} </span>}
      {children}
    </div>
  );
}

export function HighlightBox({
  accent = "emerald",
  kicker,
  children,
}: {
  accent?: BudgetAccent;
  kicker?: string;
  children: ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <div className={`rounded-lg border ${a.border} bg-gradient-to-br ${a.panel} to-transparent p-4`}>
      {kicker && <div className={`text-[10px] uppercase tracking-wide ${a.badge} mb-1`}>{kicker}</div>}
      <div className="text-sm text-foreground/90 leading-relaxed">{children}</div>
    </div>
  );
}

export function SectionToggle({
  checked,
  onChange,
  accent = "emerald",
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: BudgetAccent;
  label: string;
}) {
  const a = ACCENT[accent];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`shrink-0 relative inline-flex h-9 w-[4.25rem] items-center rounded-full border transition-all duration-300 ${
        checked ? `${a.borderActive} ${a.iconBg}` : "border-border bg-secondary hover:border-muted-foreground/40"
      }`}
    >
      <span
        className={`inline-block h-7 w-7 transform rounded-full shadow transition-transform duration-300 ${
          checked ? "translate-x-8 bg-foreground" : "translate-x-1 bg-foreground"
        }`}
      />
    </button>
  );
}

export function BudgetPanel({
  accent = "emerald",
  icon: Icon,
  title,
  description,
  badge,
  active = true,
  toggle,
  stats,
  headerExtra,
  children,
  className = "",
}: {
  accent?: BudgetAccent;
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: ReactNode;
  active?: boolean;
  toggle?: { checked: boolean; onChange: (v: boolean) => void; label: string };
  stats?: ReactNode;
  headerExtra?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const a = ACCENT[accent];
  const isLive = toggle ? toggle.checked : active;

  return (
    <section
      className={`rounded-xl border overflow-hidden transition-all duration-500 ${
        isLive
          ? `${a.border} bg-gradient-to-br ${a.panel} via-card to-card ${a.shadow}`
          : "border-border bg-card/60"
      } ${className}`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`rounded-lg p-2.5 transition-colors ${isLive ? `${a.iconBg} ${a.iconText}` : "bg-secondary text-muted-foreground"}`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-medium text-foreground flex flex-wrap items-center gap-2">
                {title}
                {badge}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {headerExtra}
            {toggle && (
              <SectionToggle
                checked={toggle.checked}
                onChange={toggle.onChange}
                accent={accent}
                label={toggle.label}
              />
            )}
          </div>
        </div>

        {stats && <div className="mb-5">{stats}</div>}

        {children && (
          <div className={`${stats || toggle ? `pt-1 border-t ${a.divider}` : ""}`}>{children}</div>
        )}
      </div>
    </section>
  );
}

export function BudgetSubTabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div
      className="flex gap-1 overflow-x-auto scrollbar-none border-b border-border pb-px"
      role="tablist"
      aria-label={label}
    >
      {tabs.map(({ id, label: tabLabel }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          onClick={() => onChange(id)}
          className={`shrink-0 px-4 py-2.5 text-sm border-b-2 transition-all duration-200 whitespace-nowrap -mb-px ${
            active === id
              ? "border-emerald-500 text-emerald-400 font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tabLabel}
        </button>
      ))}
    </div>
  );
}

export function currencyInputClass(accent: BudgetAccent = "emerald") {
  return `w-full bg-background border border-border rounded-md px-3 py-2.5 pl-7 text-sm font-mono text-foreground focus:outline-none focus:ring-2 ${ACCENT[accent].focusRing}`;
}
