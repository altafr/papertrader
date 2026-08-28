import { createDatabase } from "@momentum/db";

import { buildPaperPortfolioStatus } from "./paper-portfolio-status.js";

if (process.env.PAPER_PORTFOLIO_STATUS !== "true") throw new Error("PAPER_PORTFOLIO_STATUS must be exactly true for the read-only portfolio status command.");

const { pool } = createDatabase();
try {
  const snapshot = await pool.query<{ readonly id: string; readonly captured_at: Date; readonly cash: string; readonly equity: string }>("SELECT id, captured_at, cash, equity FROM account_snapshots ORDER BY captured_at DESC LIMIT 1");
  const row = snapshot.rows[0];
  const positions = row ? await pool.query<{ readonly asset_class: string; readonly market_value: string; readonly symbol: string; readonly unrealized_pl: string; readonly quantity: string }>("SELECT asset_class, market_value, symbol, unrealized_pl, quantity FROM positions WHERE account_snapshot_id = $1 ORDER BY symbol LIMIT 25", [row.id]) : { rows: [] };
  console.log(JSON.stringify(buildPaperPortfolioStatus({ ...(row ? { capturedAt: row.captured_at, cash: row.cash, equity: row.equity } : {}), positions: positions.rows.map((position) => ({ assetClass: position.asset_class, marketValue: position.market_value, quantity: position.quantity, symbol: position.symbol, unrealizedPl: position.unrealized_pl })) })));
} finally { await pool.end(); }
