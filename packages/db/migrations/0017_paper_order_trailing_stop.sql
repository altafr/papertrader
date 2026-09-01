ALTER TABLE paper_order_submissions
  ADD COLUMN IF NOT EXISTS trailing_stop_price NUMERIC(20,8);

ALTER TABLE paper_order_submissions
  ADD CONSTRAINT paper_order_submissions_trailing_stop_positive
  CHECK (trailing_stop_price IS NULL OR trailing_stop_price > 0);
