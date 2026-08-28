import { createDatabase } from "@momentum/db";

import { buildRiskCycleStatus } from "./risk-cycle-status.js";

if (process.env.PAPER_RISK_CYCLE_STATUS !== "true") throw new Error("PAPER_RISK_CYCLE_STATUS must be exactly true for the read-only risk-cycle status command.");

const { pool } = createDatabase();
try {
  const [summary, latest] = await Promise.all([
    pool.query<{ readonly approved: number; readonly decisions: number }>("SELECT COUNT(*) FILTER (WHERE status = 'risk_dry_run_approved')::int AS approved, COUNT(*) FILTER (WHERE status LIKE 'risk_dry_run_%')::int AS decisions FROM paper_order_submissions WHERE COALESCE(updated_at, created_at) >= NOW() - INTERVAL '7 days'"),
    pool.query<{ readonly updated_at: Date | null; readonly created_at: Date; readonly status: string }>("SELECT updated_at, created_at, status FROM paper_order_submissions WHERE status LIKE 'risk_dry_run_%' ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 1"),
  ]);
  const totals = summary.rows[0];
  const latestRow = latest.rows[0];
  console.log(JSON.stringify(buildRiskCycleStatus({ approved: totals?.approved, decisions: totals?.decisions, ...(latestRow ? { latestAt: latestRow.updated_at ?? latestRow.created_at, latestStatus: latestRow.status } : {}) })));
} finally { await pool.end(); }
