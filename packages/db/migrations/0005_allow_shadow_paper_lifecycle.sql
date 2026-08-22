ALTER TABLE strategy_lifecycle_events
  DROP CONSTRAINT IF EXISTS strategy_lifecycle_allowed_transitions;

ALTER TABLE strategy_lifecycle_events
  ADD CONSTRAINT strategy_lifecycle_allowed_transitions CHECK (
    (from_stage = 'disabled' AND to_stage = 'replay')
    OR (from_stage = 'replay' AND to_stage = 'shadow')
    OR (from_stage = 'shadow' AND to_stage = 'paper')
  );
