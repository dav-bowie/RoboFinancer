# RoboFinancer

RoboFinancer is an AI-powered compensation clarity web app for tech professionals. It gives you real after-tax take-home numbers, market salary benchmarking against 95,000+ H1B records, a budget planner, and a side-by-side offer comparison — all running locally in the browser with no account required.

**Live demo:** https://robo-financer.vercel.app

[Add screenshot here]

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite 6 |
| Styling | Tailwind CSS 4 + shadcn/ui + Radix UI |
| Charts | Recharts 2 |
| Routing | URL query params (no router) |
| Data | Supabase (PostgreSQL) — 95,518 H1B salary records |
| AI | Claude (claude-sonnet-4-6) via Vercel serverless proxy |
| Tests | Vitest |
| Deployment | Vercel |
| Package manager | pnpm |

---

## Run Locally

```bash
git clone https://github.com/dav-bowie/RoboFinancer
cd RoboFinancer
pnpm install
cp .env.example .env
# Fill in .env values (see Environment Variables below)
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | For live H1B data | Supabase project URL — `https://kkfazcwjrctgijewmlke.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | For live H1B data | Supabase public anon key |
| `CLAUDE_API_KEY` | For AI assistant | Anthropic API key (`sk-ant-…`) — **server-side only, never use `VITE_` prefix** |
| `VITE_MAPBOX_TOKEN` | Optional | Mapbox public token (`pk.eyJ…`) for map features |

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_MAPBOX_TOKEN` in both your local `.env` and in Vercel project settings → Environment Variables.

Set `CLAUDE_API_KEY` **only** in Vercel project settings (not in `.env`) so it never reaches the browser.

Without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, the Benchmark module falls back to static market data.

---

## Load H1B Salary Data

```bash
cd scripts
pip install -r requirements.txt
python3 loadH1B.py
```

This loads FY2025 Q4 H1B wage disclosure records into the `salary_benchmarks` table in Supabase. Apply the schema first:

```bash
# From repo root — run migration in Supabase SQL editor or via CLI
cat supabase/migrations/001_salary_benchmarks.sql
```

Set `SUPABASE_URL` and `SUPABASE_KEY` (service role) in `.env`, then run the loader. Upserts use `case_number` as the conflict key. Do not modify `LCA_Disclosure_Data_FY2025_Q4.xlsx`.

---

## Run Tests

```bash
pnpm test
```

45 tests across 3 suites covering federal tax brackets, all state tax rates, and the full tax engine breakdown.

---

## Folder Structure

```
src/
├── app/
│   ├── App.tsx                     # Root shell, tab routing, shared state, URL encoding
│   └── components/
│       ├── BenchmarkModule.tsx     # Salary benchmarking — queries Supabase H1B data
│       ├── TakeHomeModule.tsx      # Gross-to-net tax calculator (2024 brackets)
│       ├── BudgetModule.tsx        # 50/30/20 budget planner
│       ├── OfferModule.tsx         # Side-by-side offer comparison + Teleport CoL API
│       └── AIAssistant.tsx         # Floating chat widget (Claude via /api/recommend)
├── lib/
│   ├── calculations.ts             # Tax math, market data, FICA, SDI
│   ├── supabaseClient.ts           # Supabase client with null fallback
│   └── useUrlState.ts              # URL query param encoding/decoding

src/api/
└── recommend.ts                    # Vercel serverless function — Claude API proxy

scripts/
├── loadH1B.py                      # H1B wage data loader
└── requirements.txt

tests/
├── calculations.test.ts
├── stateTax.test.ts
└── taxEngine.test.ts
```

---

## License

MIT
