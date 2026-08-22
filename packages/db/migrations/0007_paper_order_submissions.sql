CREATE TABLE IF NOT EXISTS paper_order_submissions (
  intent_id TEXT PRIMARY KEY,
  approval_id TEXT NOT NULL,
  client_order_id TEXT NOT NULL UNIQUE,
  symbol TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  quantity NUMERIC(20, 8) NOT NULL,
  status TEXT NOT NULL,
  alpaca_order_id TEXT,
  filled_quantity NUMERIC(20, 8),
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT paper_order_submissions_non_empty_text CHECK (
    length(intent_id) > 0 AND length(approval_id) > 0 AND length(client_order_id) > 0 AND length(symbol) > 0
  ),
  CONSTRAINT paper_order_submissions_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS paper_order_submissions_status_updated_idx
  ON paper_order_submissions (status, updated_at DESC);
