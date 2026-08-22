CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS account_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL,
  status TEXT NOT NULL,
  currency TEXT NOT NULL,
  equity NUMERIC(20, 8) NOT NULL,
  cash NUMERIC(20, 8) NOT NULL,
  buying_power NUMERIC(20, 8) NOT NULL,
  last_equity NUMERIC(20, 8),
  captured_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT account_snapshots_equity_non_negative CHECK (equity >= 0),
  CONSTRAINT account_snapshots_currency_non_empty CHECK (length(currency) > 0)
);

CREATE INDEX IF NOT EXISTS account_snapshots_account_captured_idx
  ON account_snapshots (account_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS positions (
  account_snapshot_id UUID NOT NULL REFERENCES account_snapshots(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  quantity NUMERIC(20, 8) NOT NULL,
  average_entry_price NUMERIC(20, 8) NOT NULL,
  market_value NUMERIC(20, 8) NOT NULL,
  unrealized_pl NUMERIC(20, 8) NOT NULL,
  CONSTRAINT positions_snapshot_symbol_unique UNIQUE (account_snapshot_id, symbol),
  CONSTRAINT positions_symbol_non_empty CHECK (length(symbol) > 0)
);

CREATE TABLE IF NOT EXISTS orders (
  alpaca_order_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  client_order_id TEXT,
  symbol TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  side TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity NUMERIC(20, 8),
  filled_quantity NUMERIC(20, 8),
  status TEXT NOT NULL,
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS orders_account_updated_idx
  ON orders (account_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS activities (
  activity_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  symbol TEXT,
  quantity NUMERIC(20, 8),
  price NUMERIC(20, 8),
  transaction_time TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS activities_account_time_idx
  ON activities (account_id, transaction_time DESC);
