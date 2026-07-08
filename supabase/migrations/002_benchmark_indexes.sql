-- Speed up city-level benchmark filters
CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_state_city
  ON public.salary_benchmarks (location_state, location_city);

CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_role_state_salary
  ON public.salary_benchmarks (role_normalized, location_state, base_salary);
