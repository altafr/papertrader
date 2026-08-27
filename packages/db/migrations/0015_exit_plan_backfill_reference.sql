ALTER TABLE paper_order_submissions
  ADD COLUMN IF NOT EXISTS exit_plan_reference TEXT;
