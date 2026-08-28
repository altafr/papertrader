import { createDatabase, createTelegramAlertRepository } from "@momentum/db";
import { assessMarketCloseSummaryVerification } from "./market-close-summary-verification.js";

if (process.env.MARKET_CLOSE_SUMMARY_VERIFY !== "true") throw new Error("MARKET_CLOSE_SUMMARY_VERIFY must be exactly true for the guarded close-summary verification command.");
const { db, pool } = createDatabase();
try {
  const rows = await createTelegramAlertRepository(db).listRecent(500);
  const result = assessMarketCloseSummaryVerification(rows.map((row) => ({ code: row.code, deliveryStatus: row.deliveryStatus, occurredAt: row.occurredAt.toISOString(), dedupeKey: row.dedupeKey })));
  console.log(JSON.stringify(result));
  if (result.status !== "verified") process.exitCode = 1;
} finally { await pool.end(); }
