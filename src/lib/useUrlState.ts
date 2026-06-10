/**
 * URL state codec for RoboFinancer.
 * Encodes/decodes the key cross-module params into URL query string.
 * Uses window.history.replaceState so the page never reloads.
 */

export interface UrlState {
  tab: string;
  salary: number;
  state: string;
  k401: number;
  filing: string;
  role: string;
  level: string;
  city: string;
}

const DEFAULTS: UrlState = {
  tab: "benchmark",
  salary: 210000,
  state: "CA",
  k401: 6,
  filing: "single",
  role: "Software Engineer",
  level: "L5 / Senior",
  city: "San Francisco, CA",
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function readUrlState(): Partial<UrlState> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Partial<UrlState> = {};

  const tab = p.get("tab");
  if (tab && ["benchmark", "takehome", "budget", "offer"].includes(tab)) out.tab = tab;

  const salary = Number(p.get("salary"));
  if (salary && salary >= 10000 && salary <= 5000000) out.salary = salary;

  const state = p.get("state");
  if (state && /^[A-Z]{2}$/.test(state)) out.state = state;

  const k401 = Number(p.get("k401"));
  if (!isNaN(k401)) out.k401 = clamp(k401, 0, 23);

  const filing = p.get("filing");
  if (filing === "single" || filing === "married") out.filing = filing;

  const role = p.get("role");
  if (role) out.role = decodeURIComponent(role);

  const level = p.get("level");
  if (level) out.level = decodeURIComponent(level);

  const city = p.get("city");
  if (city) out.city = decodeURIComponent(city);

  return out;
}

export function writeUrlState(s: Partial<UrlState>) {
  if (typeof window === "undefined") return;
  const p = new URLSearchParams();

  const set = (key: string, val: string | number | undefined, def: string | number) => {
    if (val !== undefined && val !== def) p.set(key, String(val));
  };

  set("tab", s.tab, DEFAULTS.tab);
  set("salary", s.salary, DEFAULTS.salary);
  set("state", s.state, DEFAULTS.state);
  set("k401", s.k401, DEFAULTS.k401);
  set("filing", s.filing, DEFAULTS.filing);
  if (s.role && s.role !== DEFAULTS.role) p.set("role", encodeURIComponent(s.role));
  if (s.level && s.level !== DEFAULTS.level) p.set("level", encodeURIComponent(s.level));
  if (s.city && s.city !== DEFAULTS.city) p.set("city", encodeURIComponent(s.city));

  const qs = p.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}
