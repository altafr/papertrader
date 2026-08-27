CREATE TABLE IF NOT EXISTS telegram_alert_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  last_error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT telegram_alert_events_non_empty CHECK (length(dedupe_key) > 0 AND length(code) > 0 AND length(message) > 0),
  CONSTRAINT telegram_alert_events_severity_valid CHECK (severity IN ('critical', 'info', 'warning')),
  CONSTRAINT telegram_alert_events_status_valid CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  CONSTRAINT telegram_alert_events_attempts_valid CHECK (attempts >= 0)
);
CREATE INDEX IF NOT EXISTS telegram_alert_events_occurred_idx ON telegram_alert_events (occurred_at DESC);
