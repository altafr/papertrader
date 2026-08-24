import { describe, expect, it } from "vitest";

import { getWorkerHealth } from "./app.js";

describe("worker health", () => {
  it("reports external integrations as disabled", () => {
    const now = new Date("2026-08-21T00:00:00.000Z");

    expect(getWorkerHealth(now, {})).toEqual({
      alpaca: "not_configured",
      asOf: "2026-08-21T00:00:00.000Z",
      brokerConnectionEnabled: false,
      database: "not_configured",
      durableScheduler: { activationApprovalReferencePresent: true, cron: "0 0 * * *", enabled: false, status: "disabled", timezone: "UTC" },
      globalKillSwitchActive: false,
      operatingMode: "observe",
      researchSchedule: { enabled: false, handlerEnabled: false, status: "disabled" },
      shadowEvaluation: { enabled: false, intervalSeconds: 3600, sourceConfigured: false, status: "disabled" },
      service: "worker",
      telegramAlerts: { deliveryVerification: "unverified", enabled: false, status: "disabled" },
      status: "healthy",
    });
  });

  it("reports configuration presence separately from broker connection enablement", () => {
    const health = getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), {
      ALPACA_API_KEY: "paper-key",
      ALPACA_SECRET_KEY: "paper-secret",
      ALPACA_PAPER_TRADE: "true",
      BROKER_CONNECTION_ENABLED: "false",
      DATABASE_URL: "postgres://private",
      TRADING_MODE: "paper",
    });
    expect(health).toMatchObject({ alpaca: "configured", brokerConnectionEnabled: false, database: "configured", operatingMode: "observe" });
  });

  it("reports the configured daily UTC schedule without activating it", () => {
    expect(getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), { DAILY_PREPARATION_CRON: "30 2 * * *" }).durableScheduler).toMatchObject({ cron: "30 2 * * *", enabled: false, status: "disabled", timezone: "UTC" });
  });

  it("reports Telegram readiness without exposing configuration values", () => {
    expect(getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), {
      TELEGRAM_ALERTS_ENABLED: "true",
      TELEGRAM_BOT_TOKEN: "123456:ABC_def-123",
      TELEGRAM_CHAT_ID: "-1001234567890",
    }).telegramAlerts).toEqual({ deliveryVerification: "unverified", enabled: true, status: "ready" });
    expect(getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), {
      TELEGRAM_ALERTS_ENABLED: "true",
    }).telegramAlerts).toEqual({ deliveryVerification: "unverified", enabled: true, status: "blocked" });
  });

  it("reports an enabled research schedule as blocked until every gate is explicit", () => {
    expect(getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), {
      RESEARCH_SCHEDULER_ENABLED: "true",
      ALPACA_PAPER_TRADE: "true",
      TRADING_MODE: "paper",
    }).researchSchedule).toEqual({ enabled: true, handlerEnabled: false, status: "blocked" });
  });

  it("reports a fully gated but not-yet-started research schedule as ready", () => {
    expect(getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), {
      ALPACA_API_KEY: "paper-key",
      ALPACA_SECRET_KEY: "paper-secret",
      ALPACA_PAPER_TRADE: "true",
      BROKER_CONNECTION_ENABLED: "true",
      DATABASE_URL: "postgres://private",
      RESEARCH_HANDLER_ENABLED: "true",
      RESEARCH_SCHEDULER_ENABLED: "true",
      TRADING_MODE: "paper",
    }).researchSchedule).toEqual({ enabled: true, handlerEnabled: true, status: "ready" });
  });
});
