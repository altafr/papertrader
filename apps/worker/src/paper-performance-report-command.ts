import { createDatabase } from "@momentum/db";

import { buildPaperPerformanceReport } from "./paper-performance-report.js";

if (process.env.PAPER_PERFORMANCE_REPORT !== "true") {
  throw new Error("PAPER_PERFORMANCE_REPORT must be exactly true for the read-only performance report.");
}

const limit = Math.min(500, Math.max(2, Number(process.env.PAPER_PERFORMANCE_LIMIT ?? "100")));
if (!Number.isSafeInteger(limit)) throw new Error("PAPER_PERFORMANCE_LIMIT must be a bounded integer.");

const { pool } = createDatabase();
try {
  const result = await pool.query<{ readonly captured_at: Date; readonly equity: string }>(
    "SELECT captured_at, equity FROM account_snapshots ORDER BY captured_at DESC LIMIT $1",
    [limit],
  );
  const report = buildPaperPerformanceReport(result.rows.map((row) => ({ capturedAt: row.captured_at.toISOString(), equity: String(row.equity) })));
  console.log(JSON.stringify(report));
} finally {
  await pool.end();
}
