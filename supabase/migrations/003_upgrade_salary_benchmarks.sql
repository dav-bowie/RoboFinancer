-- Upgrade existing salary_benchmarks tables created before case_number existed.
-- Safe to run multiple times.

ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS case_number TEXT;
ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS role_normalized TEXT;
ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS base_salary INTEGER;
ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS location_state TEXT;
ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;
ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'h1b';
ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS bonus INTEGER;
ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS equity_annual INTEGER;
ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS years_exp INTEGER;
ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS total_comp INTEGER;
ALTER TABLE public.salary_benchmarks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- id column only if table was created without it (skip if already has a primary key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'salary_benchmarks' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.salary_benchmarks ADD COLUMN id UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_salary_benchmarks_case_number_unique
  ON public.salary_benchmarks (case_number)
  WHERE case_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_role_state
  ON public.salary_benchmarks (role_normalized, location_state);

CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_state_salary
  ON public.salary_benchmarks (location_state, base_salary);

CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_state_city
  ON public.salary_benchmarks (location_state, location_city);

CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_role_state_salary
  ON public.salary_benchmarks (role_normalized, location_state, base_salary);

ALTER TABLE public.salary_benchmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read salary benchmarks" ON public.salary_benchmarks;
CREATE POLICY "Public read salary benchmarks"
  ON public.salary_benchmarks
  FOR SELECT
  USING (true);

COMMENT ON TABLE public.salary_benchmarks IS 'H1B LCA base salary rows for compensation benchmarking';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'salary_benchmarks' AND column_name = 'case_number'
  ) THEN
    EXECUTE $c$COMMENT ON COLUMN public.salary_benchmarks.case_number IS 'DOL LCA case number — upsert conflict target for loader'$c$;
  END IF;
END $$;
