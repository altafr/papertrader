CREATE TABLE IF NOT EXISTS tech_solver_cases (
  fingerprint TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  last_attempt_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tech_solver_cases_non_empty_text CHECK (length(fingerprint) > 0 AND length(category) > 0 AND length(problem) > 0 AND length(solution) > 0),
  CONSTRAINT tech_solver_cases_attempts_non_negative CHECK (attempts >= 0),
  CONSTRAINT tech_solver_cases_status_valid CHECK (status IN ('open', 'resolved', 'manual_review'))
);
CREATE INDEX IF NOT EXISTS tech_solver_cases_category_updated_idx ON tech_solver_cases (category, updated_at DESC);
