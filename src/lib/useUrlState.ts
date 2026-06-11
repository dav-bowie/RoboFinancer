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

  // Only honor k401 when the param is actually present — Number(null) is 0,
  // which would otherwise clobber the 6% default for visitors with no k401 param.
  const k401Raw = p.get("k401");
  if (k401Raw !== null && k401Raw !== "") {
    const k401 = Number(k401Raw);
    if (!isNaN(k401)) out.k401 = clamp(k401, 0, 23);
  }

  const filing = p.get("filing");
  if (filing === "single" || filing === "married") out.filing = filing;

  // URLSearchParams.get() already percent-decodes; no manual decode needed.
  const role = p.get("role");
  if (role) out.role = role;

  const level = p.get("level");
  if (level) out.level = level;

  const city = p.get("city");
  if (city) out.city = city;

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
  // URLSearchParams.set() + toString() percent-encode values automatically;
  // encoding here too would double-encode (e.g. spaces -> %2520).
  if (s.role && s.role !== DEFAULTS.role) p.set("role", s.role);
  if (s.level && s.level !== DEFAULTS.level) p.set("level", s.level);
  if (s.city && s.city !== DEFAULTS.city) p.set("city", s.city);

  const qs = p.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}
