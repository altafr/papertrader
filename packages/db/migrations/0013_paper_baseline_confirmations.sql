CREATE TABLE IF NOT EXISTS paper_baseline_confirmations (
  confirmation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL,
  baseline NUMERIC(20,8) NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  note TEXT NOT NULL,
  snapshot_id UUID NOT NULL REFERENCES account_snapshots(id) ON DELETE RESTRICT,
  CONSTRAINT paper_baseline_confirmations_positive_baseline CHECK (baseline > 0),
  CONSTRAINT paper_baseline_confirmations_non_empty_text CHECK (length(account_id) > 0 AND length(reference) > 0 AND length(note) > 0)
);
CREATE INDEX IF NOT EXISTS paper_baseline_confirmations_account_idx ON paper_baseline_confirmations (account_id, confirmed_at DESC);
