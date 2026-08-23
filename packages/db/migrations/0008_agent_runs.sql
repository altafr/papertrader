CREATE TABLE IF NOT EXISTS agent_runs (
  run_id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL,
  task TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model_provider TEXT,
  input_refs JSONB NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_code TEXT,
  artifact_type TEXT,
  artifact_schema_version TEXT,
  artifact_confidence TEXT,
  artifact_rationale TEXT,
  artifact_evidence_refs JSONB,
  artifact_payload JSONB,
  CONSTRAINT agent_runs_non_empty_text CHECK (length(run_id) > 0 AND length(agent_type) > 0 AND length(prompt_version) > 0 AND length(task) > 0),
  CONSTRAINT agent_runs_status_valid CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  CONSTRAINT agent_runs_artifact_pairing CHECK (status <> 'succeeded' OR (artifact_type IS NOT NULL AND artifact_rationale IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS agent_runs_status_created_idx ON agent_runs (status, created_at DESC);
