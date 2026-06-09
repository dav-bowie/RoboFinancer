# RoboFinancer

RoboFinancer is an AI-powered compensation clarity tool for tech professionals. It combines real-time tax calculations, market salary benchmarking, budget planning, and side-by-side offer comparison — all running locally in the browser with no account required.

**Live demo:** https://robofinancer.vercel.app

## Tech stack

- React 18 + TypeScript (strict mode)
- Vite 6
- Tailwind CSS 4
- shadcn/ui + Radix UI
- Recharts
- React Router 7
- Vitest (unit tests)
- Vercel (deployment + serverless API)

## Run locally

```bash
git clone https://github.com/yourusername/robofinancer.git
cd robofinancer
pnpm install
cp .env.example .env.local
# Fill in .env.local with your keys (see Environment variables below)
pnpm dev
```

Open http://localhost:5173 in your browser.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Optional | Supabase project URL — enables data persistence |
| `VITE_SUPABASE_ANON_KEY` | Optional | Supabase public anon key |
| `CLAUDE_API_KEY` | Required for AI | Anthropic API key — powers the AI assistant (server-side only, never prefix with `VITE_`) |
| `VITE_MAPBOX_TOKEN` | Optional | Mapbox token for map features |

`CLAUDE_API_KEY` must be set in your Vercel project environment variables (not in `.env.local`) so it never reaches the browser.

## Folder structure

```
src/
├── app/
│   ├── App.tsx                      # Root shell, tab routing, shared state
│   └── components/
│       ├── BenchmarkModule.tsx      # Salary benchmarking vs. market
│       ├── TakeHomeModule.tsx       # Gross-to-net tax calculator
│       ├── BudgetModule.tsx         # 50/30/20 budget planner
│       ├── OfferModule.tsx          # Side-by-side offer comparison
│       ├── AIAssistant.tsx          # Floating chat assistant
│       ├── ui/                      # shadcn/ui primitives (Radix-based)
│       └── figma/                   # Figma Make helpers
├── data/
│   ├── taxBrackets.ts               # 2024 federal bracket data + constants
│   ├── stateTaxRates.ts             # All 50 states + DC rates
│   └── budgetRules.ts               # Framework definitions
├── hooks/
│   ├── useTaxCalculation.ts         # Stateful wrapper for calcFullBreakdown
│   ├── useBenchmark.ts              # Market data + percentile hook
│   └── useAIRecommendation.ts       # AI recommendation fetch hook
├── lib/
│   ├── calculations.ts              # Legacy all-in-one module (Figma Make)
│   └── supabaseClient.ts            # Supabase client stub
├── styles/
└── utils/
    ├── federalTax.ts                # 2024 federal income tax
    ├── stateTax.ts                  # State income tax (all 50 + DC)
    ├── taxEngine.ts                 # Full deduction orchestrator
    ├── budgetFrameworks.ts          # Budget framework logic
    ├── percentile.ts                # Percentile + verdict helpers
    └── aiRecommendations.ts         # Claude API client stub

api/
└── recommend.ts                     # Vercel serverless AI proxy

tests/
├── federalTax.test.ts
├── stateTax.test.ts
└── taxEngine.test.ts

docs/
├── system-design.md
├── data-model.md
└── sequences/
    ├── ai-recommendation-flow.md
    └── salary-benchmark-flow.md

scripts/
├── loadH1B.py                       # H-1B wage data loader stub
└── scraper.py                       # Levels.fyi / Glassdoor scraper stub
```

## Run tests

```bash
pnpm test
```

Tests cover federal tax brackets, all state tax rates, and the full tax engine breakdown.
