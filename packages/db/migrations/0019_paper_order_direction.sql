ALTER TABLE paper_order_submissions
  ADD COLUMN IF NOT EXISTS side TEXT NOT NULL DEFAULT 'buy';

ALTER TABLE paper_order_submissions
  ADD CONSTRAINT paper_order_submissions_side_valid CHECK (side IN ('buy', 'sell'));
