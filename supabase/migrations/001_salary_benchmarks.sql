-- Canonical salary_benchmarks table for H1B wage disclosures
-- Public read; writes via service role (loader script)

CREATE TABLE IF NOT EXISTS public.salary_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT UNIQUE,
  company TEXT,
  role TEXT,
  role_normalized TEXT NOT NULL,
  base_salary INTEGER NOT NULL CHECK (base_salary >= 0),
  location_state TEXT NOT NULL,
  location_city TEXT,
  scraped_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'h1b',
  bonus INTEGER,
  equity_annual INTEGER,
  level TEXT,
  years_exp INTEGER,
  total_comp INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_role_state
  ON public.salary_benchmarks (role_normalized, location_state);

CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_state_salary
  ON public.salary_benchmarks (location_state, base_salary);

ALTER TABLE public.salary_benchmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read salary benchmarks" ON public.salary_benchmarks;
CREATE POLICY "Public read salary benchmarks"
  ON public.salary_benchmarks
  FOR SELECT
  USING (true);

COMMENT ON TABLE public.salary_benchmarks IS 'H1B LCA base salary rows for compensation benchmarking';
COMMENT ON COLUMN public.salary_benchmarks.case_number IS 'DOL LCA case number — upsert conflict target for loader';
