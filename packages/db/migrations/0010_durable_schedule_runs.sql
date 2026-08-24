CREATE TABLE IF NOT EXISTS durable_schedule_runs (
  run_id TEXT PRIMARY KEY,
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  account_snapshot_id UUID REFERENCES account_snapshots(id) ON DELETE RESTRICT,
  failure_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  CONSTRAINT durable_schedule_runs_non_empty_text CHECK (length(run_id) > 0),
  CONSTRAINT durable_schedule_runs_status_valid CHECK (status IN ('running', 'completed', 'failed')),
  CONSTRAINT durable_schedule_runs_terminal_fields CHECK (
    (status = 'running' AND completed_at IS NULL AND account_snapshot_id IS NULL AND failure_code IS NULL)
    OR (status = 'completed' AND completed_at IS NOT NULL AND account_snapshot_id IS NOT NULL AND failure_code IS NULL)
    OR (status = 'failed' AND completed_at IS NOT NULL AND failure_code IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS durable_schedule_runs_scheduled_idx
  ON durable_schedule_runs (scheduled_at DESC);
