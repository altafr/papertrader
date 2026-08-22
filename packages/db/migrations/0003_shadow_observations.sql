CREATE TABLE IF NOT EXISTS shadow_observations (
  observation_id TEXT PRIMARY KEY,
  strategy_key TEXT NOT NULL,
  strategy_version TEXT NOT NULL,
  symbol TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  signal_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  time_stop_at TIMESTAMPTZ,
  proposed_entry_price NUMERIC(20, 8) NOT NULL,
  planned_stop_price NUMERIC(20, 8) NOT NULL,
  planned_exit_price NUMERIC(20, 8),
  score NUMERIC(20, 8) NOT NULL,
  rationale TEXT NOT NULL,
  CONSTRAINT shadow_observation_non_empty_text CHECK (
    length(observation_id) > 0 AND length(strategy_key) > 0 AND length(strategy_version) > 0
    AND length(symbol) > 0 AND length(rationale) > 0
  ),
  CONSTRAINT shadow_observation_prices_non_negative CHECK (
    proposed_entry_price >= 0 AND planned_stop_price >= 0
    AND (planned_exit_price IS NULL OR planned_exit_price >= 0)
  )
);

CREATE INDEX IF NOT EXISTS shadow_observations_strategy_signal_idx
  ON shadow_observations (strategy_key, strategy_version, signal_time DESC);

CREATE TABLE IF NOT EXISTS shadow_observation_outcomes (
  observation_id TEXT PRIMARY KEY REFERENCES shadow_observations(observation_id) ON DELETE CASCADE,
  observed_at TIMESTAMPTZ NOT NULL,
  exit_price NUMERIC(20, 8) NOT NULL,
  reason TEXT NOT NULL,
  return_percent NUMERIC(20, 8) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shadow_outcome_exit_positive CHECK (exit_price > 0),
  CONSTRAINT shadow_outcome_reason_valid CHECK (reason IN ('expired', 'invalidated', 'stop', 'target', 'time_stop'))
);
