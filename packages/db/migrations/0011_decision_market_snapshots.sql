ALTER TABLE shadow_observations
  ADD COLUMN IF NOT EXISTS market_snapshot JSONB;

ALTER TABLE paper_order_submissions
  ADD COLUMN IF NOT EXISTS market_snapshot JSONB;
