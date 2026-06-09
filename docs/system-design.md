# System Design — RoboFinancer

## Overview

RoboFinancer is a single-page React application that runs all tax and compensation math in the browser. The only server-side component is the AI recommendation proxy (`api/recommend.ts`), which keeps the Anthropic API key out of the client bundle.

## Architecture

```
Browser (React SPA)
│
├── App.tsx          ← shared state, tab routing
├── modules          ← four feature modules (Benchmark, TakeHome, Budget, Offer)
├── AIAssistant      ← chat panel (rule-based today; calls /api/recommend when wired)
├── src/utils/       ← pure tax/budget math (no side effects)
├── src/data/        ← static data: brackets, rates, frameworks
└── src/hooks/       ← React wrappers around utils

                          ↓ POST /api/recommend
Vercel Serverless (Node)
└── api/recommend.ts ← receives context + message, calls Anthropic API, returns text

Anthropic API (claude-sonnet-4-6)
└── Returns personalized compensation advice
```

## Data flow

1. User enters gross salary, state, filing status, 401k rate in `TakeHomeModule`
2. `calcFullBreakdown()` is called synchronously — no network request
3. Result (`netTakeHome`) is lifted to `App.tsx` and passed to `BudgetModule`
4. `BenchmarkModule` calls `getMarketData()` + `calcPercentile()` synchronously
5. `OfferModule` calls `calcFullBreakdown()` for each of the two offers
6. `AIAssistant` builds a context object from App state and sends it to `/api/recommend`

## Tax calculation pipeline

```
gross
  → traditional401k deducted from federal AND state taxable income
  → standard deduction deducted from federal taxable income only
  → calcFederalTax(federalTaxableIncome, filingStatus)
  → calcStateTax(stateTaxableIncome, state)
  → Social Security: 6.2% × min(gross, $168,600)
  → Medicare: 1.45% × gross
  → CA SDI: 1.1% × gross (CA only)
  → netTakeHome = gross − all of the above − roth401k
```

## Scalability notes

- **Market data** is currently hardcoded in `calculations.ts`. A future version should pull from a Supabase table populated by `scripts/loadH1B.py`.
- **State tax data** is static in `src/data/stateTaxRates.ts`. Should be updated each January when states publish new rates.
- **AI responses** are cached at the Vercel edge layer; identical prompts return the same result within the cache TTL.

## Security

- `CLAUDE_API_KEY` is never in the client bundle — it is only accessible in the Vercel runtime environment.
- `VITE_SUPABASE_ANON_KEY` is a public key by design (Row Level Security enforces access control at the database level).
- All dollar amounts are computed fresh on every render — no financial data is stored client-side between sessions.
