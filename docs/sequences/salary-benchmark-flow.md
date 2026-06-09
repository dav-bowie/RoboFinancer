# Sequence: Salary Benchmark Flow

## Data flow

```
User selects Role, Level, City in BenchmarkModule
User enters Base, Bonus, Equity/yr
        │
        ▼
BenchmarkModule.tsx:
  totalComp = baseSalary + bonus + equity
        │
        ▼
useBenchmark(role, level, city, totalComp)
        │
        ├── getMarketData(role, level, city)
        │     │  looks up BASE_MARKET_DATA[role][level]
        │     │  applies CITY_MULTIPLIERS[city]
        │     └─ returns { p25, p50, p75, p90 } or null
        │
        ├── calcPercentile(totalComp, marketData)
        │     │  linear interpolation between anchor points
        │     └─ returns integer 0–99
        │
        └── getVerdict(percentile)
              └─ returns 'Above Market' | 'At Market' | 'Below Market' | 'Significantly Below Market'
        │
        ▼
BenchmarkModule renders:
  - Percentile number (large, color-coded)
  - Verdict label
  - Animated progress bar (p position marked)
  - Market range table (p25 / p50 / p75 / p90 in dollars)
  - Negotiation insight panel (if < 50th percentile)
  - Strong market read panel (if ≥ 75th percentile)
        │
        ▼
BenchmarkModule calls onUpdate({ role, level, city, totalComp })
        │
        ▼
App.tsx updates benchmarkCtx → AIAssistant context refreshed
```

## City multiplier logic

Market data is stored at a national baseline. Each city has a multiplier:
- San Francisco, CA: 1.38× (highest)
- Remote: 1.00× (national baseline)
- Raleigh, NC: 0.85× (lowest)

`getMarketData` multiplies all four percentile values by the city multiplier.

## Limitations (current implementation)

- Market data is hardcoded in `src/lib/calculations.ts` — 7 roles, 20 cities
- Percentile interpolation is linear; real distributions are right-skewed at the top
- No confidence intervals — small sample sizes at rare role/level/city combos are not flagged
- No time dimension — data does not reflect market corrections or layoff periods
