import { getTelegramNotificationReadiness } from "@momentum/notifications";

if (process.env.TELEGRAM_ALERT_READINESS !== "true") {
  throw new Error("Set TELEGRAM_ALERT_READINESS=true to run this read-only check.");
}

const readiness = getTelegramNotificationReadiness();
console.log(JSON.stringify(readiness));
if (readiness.status === "blocked") process.exitCode = 1;
