# Data Model — RoboFinancer

## In-browser state (URL-encoded share links)

User inputs live in React state and sync to URL query params via `useUrlState`, `offerUrlState`, and `budgetUrlState`. No accounts or server-side persistence.

### App-level shared state (`App.tsx`)

```typescript
benchmarkCtx: {
  role: string;
  level: string;
  city: string;
  totalComp: number;    // base + bonus + equity
  baseSalary: number;
  bonus: number;
  equity: number;
  state: string;        // two-letter code from city
  percentile: number | null;
  usingLiveData: boolean;
}

takeHomeCtx: {
  grossSalary: number;       // base salary only (from Benchmark)
  netTakeHome: number;       // after tax, before post-tax Roth IRA
  spendableTakeHome: number; // net minus post-tax Roth IRA — Budget income base
  state: string;
  retirementRate: number;
  filingStatus: 'single' | 'married';
  k401Type: 'traditional' | 'roth';
  k401Amount: number;
  employerMatch: number;
  rothIRA: number;
  hsaAmount: number;
  age50Plus: boolean;
  age55Plus: boolean;
  hsaCoverage: 'self' | 'family';
  // tax line items…
}
```

### URL parameters

| Param | Module | Content |
|---|---|---|
| `tab`, `role`, `level`, `city`, `salary`, `bonus`, `equity`, `state`, `k401`, `filing` | Benchmark / Take-Home | Core comp & tax inputs |
| `offers` | Offer | Base64 JSON offer comparison snapshot |
| `budget` | Budget / Take-Home | Base64 JSON: `cashFlowExpenses`, `balanceSheet`, `takeHomeSettings` |

Partial share links (without `budget`) show a banner; re-copy the link after editing budget or contribution settings to share the full scenario.

## Supabase — `salary_benchmarks`

Canonical DDL: `supabase/migrations/001_salary_benchmarks.sql`

| column | type | notes |
|---|---|---|
| id | uuid | primary key |
| case_number | text | unique — DOL LCA case number; upsert key for loader |
| company | text | employer name |
| role | text | SOC title |
| role_normalized | text | lowercase for `ilike` queries |
| base_salary | integer | annual USD |
| location_state | text | two-letter state |
| location_city | text | optional |
| scraped_at | timestamptz | LCA begin date |
| source | text | `'h1b'` |
| bonus, equity_annual, level, years_exp | nullable | reserved |
| total_comp | integer | defaults to base_salary for H1B rows |

**RLS:** public `SELECT`; writes via service role in `scripts/loadH1B.py`.

**Benchmark query:** filters by `role_normalized` + `location_state`, compares user **base salary** to H1B `base_salary` for live percentile. Static fallback uses **total comp** vs hardcoded market bands.

## Static data files

### `src/data/taxBrackets.ts`
- Federal bracket arrays (2024 tax year)
- Standard deduction ($14,600 single / $29,200 MFJ)

### `src/lib/contributionLimits.ts`
- IRS 2026 elective deferral, HSA, Roth IRA limits and catch-up rules

### `src/data/stateTaxRates.ts`
- State income tax rates and brackets

### `src/data/budgetRules.ts`
- Budget framework definitions (50/30/20, etc.)

## Tax engine

Input/output types documented in `docs/system-design.md`. Tax **brackets** use 2024; **contribution limits** use IRS 2026 figures.
