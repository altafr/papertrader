CREATE TABLE IF NOT EXISTS durable_one_run_audits (
  run_id TEXT PRIMARY KEY,
  approval_reference TEXT NOT NULL,
  account_snapshot_id UUID NOT NULL REFERENCES account_snapshots(id) ON DELETE RESTRICT,
  captured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  CONSTRAINT durable_one_run_audits_non_empty_text CHECK (length(run_id) > 0 AND length(approval_reference) > 0),
  CONSTRAINT durable_one_run_audits_status_valid CHECK (status = 'completed')
);

CREATE INDEX IF NOT EXISTS durable_one_run_audits_captured_idx
  ON durable_one_run_audits (captured_at DESC);
