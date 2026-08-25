ALTER TABLE paper_order_submissions
  ADD COLUMN IF NOT EXISTS risk_decision JSONB;
