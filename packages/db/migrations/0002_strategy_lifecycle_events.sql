CREATE TABLE IF NOT EXISTS strategy_lifecycle_events (
  event_id TEXT PRIMARY KEY,
  strategy_key TEXT NOT NULL,
  strategy_version TEXT NOT NULL,
  revision INTEGER NOT NULL,
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  approved_by TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL,
  approval_note TEXT NOT NULL,
  evidence_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT strategy_lifecycle_strategy_revision_unique UNIQUE (strategy_key, strategy_version, revision),
  CONSTRAINT strategy_lifecycle_non_empty_text CHECK (
    length(event_id) > 0 AND length(strategy_key) > 0 AND length(strategy_version) > 0
    AND length(actor_id) > 0 AND length(reason) > 0 AND length(approved_by) > 0
    AND length(approval_note) > 0 AND length(evidence_key) > 0
  ),
  CONSTRAINT strategy_lifecycle_revision_positive CHECK (revision > 0),
  CONSTRAINT strategy_lifecycle_disabled_replay_only CHECK (from_stage = 'disabled' AND to_stage = 'replay')
);

CREATE INDEX IF NOT EXISTS strategy_lifecycle_strategy_revision_idx
  ON strategy_lifecycle_events (strategy_key, strategy_version, revision DESC);
