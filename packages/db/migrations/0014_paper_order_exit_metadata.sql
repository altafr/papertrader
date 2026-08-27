ALTER TABLE paper_order_submissions
  ADD COLUMN IF NOT EXISTS entry_price NUMERIC(20,8),
  ADD COLUMN IF NOT EXISTS planned_stop_price NUMERIC(20,8),
  ADD COLUMN IF NOT EXISTS planned_target_price NUMERIC(20,8),
  ADD COLUMN IF NOT EXISTS strategy_key TEXT,
  ADD COLUMN IF NOT EXISTS strategy_version TEXT,
  ADD COLUMN IF NOT EXISTS time_stop_at TIMESTAMPTZ;
