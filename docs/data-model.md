# Data Model — RoboFinancer

## In-browser state (ephemeral, no persistence)

### App-level shared state (`App.tsx`)

```typescript
benchmarkCtx: {
  role: string;         // e.g. 'Software Engineer'
  level: string;        // e.g. 'L5 / Senior'
  city: string;         // e.g. 'San Francisco, CA'
  totalComp: number;    // base + bonus + equity, annual dollars
}

takeHomeCtx: {
  grossSalary: number;    // pre-tax annual salary
  netTakeHome: number;    // after all deductions
  state: string;          // two-letter state code
  retirementRate: number; // 401k contribution as integer percent
}
```

### Tax engine input (`TaxInputs`)

```typescript
{
  gross: number;            // annual gross salary
  filingStatus: 'single' | 'married';
  state: string;            // two-letter state code
  traditional401k: number;  // pre-tax contribution, dollars
  roth401k: number;         // after-tax contribution, dollars
}
```

### Tax engine output (`TaxBreakdown`)

```typescript
{
  gross: number;
  traditional401k: number;
  roth401k: number;
  federalTaxableIncome: number;
  stateTaxableIncome: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  sdi: number;              // CA SDI; 0 for all other states
  netTakeHome: number;
}
```

### Market data (`MarketData`)

```typescript
{
  p25: number;  // 25th percentile total comp for role/level/city
  p50: number;
  p75: number;
  p90: number;
}
```

## Static data files

### `src/data/taxBrackets.ts`
- Federal bracket arrays (single and married filing jointly, 2024)
- Standard deduction constants ($14,600 single / $29,200 MFJ)
- 401k limits ($23,000 traditional, $30,500 catch-up)
- FICA constants (SS wage base $168,600, SS rate 6.2%, Medicare rate 1.45%)
- CA SDI rate (1.1%)

### `src/data/stateTaxRates.ts`
- `ZERO_TAX_STATES`: Set of 9 state codes
- `FLAT_RATE_STATES`: Record<state, rate> for 15 states
- `BRACKET_STATES`: Record<state, Bracket[]> for 27 states + DC

### `src/data/budgetRules.ts`
- Three framework definitions (50/30/20, 60/20/20, 60/30/10)

## Future Supabase tables (not yet implemented)

### `market_data`
| column | type | notes |
|---|---|---|
| id | uuid | primary key |
| role | text | |
| level | text | |
| city | text | |
| p25 | integer | annual dollars |
| p50 | integer | |
| p75 | integer | |
| p90 | integer | |
| source | text | 'levels_fyi' / 'h1b' / 'glassdoor' |
| year | integer | tax year |
| updated_at | timestamptz | |

### `h1b_wages`
| column | type | notes |
|---|---|---|
| id | uuid | primary key |
| employer | text | |
| job_title | text | |
| state | text | two-letter code |
| wage_rate | integer | annual |
| year | integer | fiscal year |
