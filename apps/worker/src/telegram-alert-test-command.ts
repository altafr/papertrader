import { getTelegramNotificationConfig, sendTelegramAlert } from "@momentum/notifications";

if (process.env.TELEGRAM_ALERT_TEST !== "true") throw new Error("TELEGRAM_ALERT_TEST must be exactly true for the guarded Telegram test command.");
const approvalReference = process.env.TELEGRAM_ALERT_TEST_APPROVAL_REFERENCE?.trim();
if (!approvalReference || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(approvalReference)) throw new Error("TELEGRAM_ALERT_TEST_APPROVAL_REFERENCE is required and must be a bounded non-secret reference.");
const config = getTelegramNotificationConfig();
if (!config.enabled) throw new Error("TELEGRAM_ALERTS_ENABLED must be true for the guarded Telegram test command.");
await sendTelegramAlert(config, { code: "telegram_channel_test", message: `Telegram alert channel test passed. Reference: ${approvalReference}`, occurredAt: new Date().toISOString(), severity: "info" });
console.log("Telegram alert channel test sent.");
