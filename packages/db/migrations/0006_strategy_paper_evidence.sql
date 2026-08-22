CREATE TABLE IF NOT EXISTS strategy_paper_evidence (
  evidence_id TEXT PRIMARY KEY,
  strategy_key TEXT NOT NULL,
  strategy_version TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  consecutive_calendar_days INTEGER NOT NULL,
  closed_trades INTEGER NOT NULL,
  positive_trades INTEGER NOT NULL,
  max_drawdown_percent NUMERIC(20, 8) NOT NULL,
  risk_violation_count INTEGER NOT NULL,
  stale_data_breach_count INTEGER NOT NULL,
  duplicate_order_count INTEGER NOT NULL,
  CONSTRAINT strategy_paper_evidence_counts_non_negative CHECK (
    closed_trades >= 0 AND positive_trades >= 0 AND consecutive_calendar_days >= 0
    AND risk_violation_count >= 0 AND stale_data_breach_count >= 0 AND duplicate_order_count >= 0
  ),
  CONSTRAINT strategy_paper_evidence_positive_within_closed CHECK (positive_trades <= closed_trades),
  CONSTRAINT strategy_paper_evidence_drawdown_non_negative CHECK (max_drawdown_percent >= 0)
);

CREATE INDEX IF NOT EXISTS strategy_paper_evidence_strategy_captured_idx
  ON strategy_paper_evidence (strategy_key, strategy_version, captured_at DESC);
