import { createDatabase, createTelegramAlertRepository } from "@momentum/db";
import { getTelegramNotificationConfig, sendTelegramAlert } from "@momentum/notifications";

if (process.env.TELEGRAM_ALERT_TEST !== "true") throw new Error("TELEGRAM_ALERT_TEST must be exactly true for the guarded Telegram test command.");
const approvalReference = process.env.TELEGRAM_ALERT_TEST_APPROVAL_REFERENCE?.trim();
if (!approvalReference || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(approvalReference)) throw new Error("TELEGRAM_ALERT_TEST_APPROVAL_REFERENCE is required and must be a bounded non-secret reference.");
const config = getTelegramNotificationConfig();
if (!config.enabled) throw new Error("TELEGRAM_ALERTS_ENABLED must be true for the guarded Telegram test command.");
if (!process.env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required so the guarded Telegram test is auditable.");
const { db, pool } = createDatabase(process.env.DATABASE_URL);
const repository = createTelegramAlertRepository(db);
const occurredAt = new Date().toISOString();
const event = await repository.enqueue({ code: "telegram_channel_test", dedupeKey: `telegram_channel_test:${approvalReference}`, message: `Telegram alert channel test passed. Reference: ${approvalReference}`, occurredAt: new Date(occurredAt), severity: "info" });
if (!event) throw new Error("Telegram alert test reference has already been used.");
try {
  await sendTelegramAlert(config, { code: "telegram_channel_test", message: `Telegram alert channel test passed. Reference: ${approvalReference}`, occurredAt, severity: "info" });
  await repository.markSent(event.eventId);
  console.log("Telegram alert channel test sent.");
} catch {
  await repository.markFailed(event.eventId, "telegram_delivery_failed");
  console.error("Telegram alert channel test failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
