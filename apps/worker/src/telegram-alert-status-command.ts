import { createDatabase } from "@momentum/db";

import { buildTelegramAlertStatus } from "./telegram-alert-status.js";

if (process.env.TELEGRAM_ALERT_STATUS !== "true") throw new Error("TELEGRAM_ALERT_STATUS must be exactly true for the read-only Telegram outbox status command.");

const { pool } = createDatabase();
try {
  const [counts, latest] = await Promise.all([
    pool.query<{ readonly delivery_status: string; readonly count: number }>("SELECT delivery_status, COUNT(*)::int AS count FROM telegram_alert_events GROUP BY delivery_status ORDER BY delivery_status"),
    pool.query<{ readonly attempts: number; readonly code: string; readonly delivery_status: string; readonly occurred_at: Date }>("SELECT attempts, code, delivery_status, occurred_at FROM telegram_alert_events ORDER BY occurred_at DESC LIMIT 1"),
  ]);
  const row = latest.rows[0];
  console.log(JSON.stringify(buildTelegramAlertStatus({ counts: Object.fromEntries(counts.rows.map((item) => [item.delivery_status, item.count])), ...(row ? { latest: { attempts: row.attempts, code: row.code, deliveryStatus: row.delivery_status, occurredAt: row.occurred_at.toISOString() } } : {}) })));
} finally { await pool.end(); }
