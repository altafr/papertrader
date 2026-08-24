import { getTelegramAlertTestReadiness } from "@momentum/notifications";

if (process.env.TELEGRAM_ALERT_TEST_READINESS !== "true") {
  throw new Error("Set TELEGRAM_ALERT_TEST_READINESS=true to run this no-send preflight.");
}

const readiness = getTelegramAlertTestReadiness();
console.log(JSON.stringify(readiness));
if (readiness.status === "blocked") process.exitCode = 1;
