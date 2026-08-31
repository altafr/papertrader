import { describe, expect, it } from "vitest";

import { deriveWorkerHealthStatus, getWorkerHealth } from "./app.js";
import { classifyMarketStreamFreshness, getExpectedBarIntervalMs, getMarketStreamStaleDedupeKey } from "./market-stream-runner.js";
import { setPositionManagementUnmanagedCount } from "./position-management-scheduler.js";

describe("market stream freshness", () => {
  it("degrades Worker health while unmanaged positions remain", () => {
    setPositionManagementUnmanagedCount(2);
    expect(getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), {}).positionManagement).toMatchObject({ unmanagedCount: 2, status: "degraded" });
    setPositionManagementUnmanagedCount(undefined);
    expect(getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), {}).positionManagement.status).toBe("disabled");
  });

  it("classifies missing, fresh, and stale message timestamps", () => {
    const now = new Date("2026-08-29T00:05:00.000Z");
    expect(classifyMarketStreamFreshness(undefined, now)).toBe("unknown");
    expect(classifyMarketStreamFreshness("2026-08-29T00:04:30.000Z", now)).toBe("fresh");
    expect(classifyMarketStreamFreshness("2026-08-28T23:59:00.000Z", now)).toBe("stale");
    expect(classifyMarketStreamFreshness("2026-08-29T00:00:00.000Z", now, 15 * 60_000)).toBe("fresh");
  });

  it("uses the configured interval for intraday stream gap recovery", () => {
    expect(getExpectedBarIntervalMs("5Min")).toBe(5 * 60_000);
    expect(getExpectedBarIntervalMs("15Min")).toBe(15 * 60_000);
    expect(getExpectedBarIntervalMs("1Hour")).toBe(60 * 60_000);
  });

  it("uses a time-bucketed stale alert key so later outages remain auditable", () => {
    expect(getMarketStreamStaleDedupeKey("crypto", new Date("2026-08-29T12:34:56.000Z"))).toBe("market_stream_stale:crypto:2026-08-29T12");
  });
});

describe("worker health", () => {
  it("degrades top-level health for active stale or supervisor failures", () => {
    expect(deriveWorkerHealthStatus({ marketStreamFreshness: "stale", positionManagementStatus: "ready", researchScheduleStatus: "scheduled" })).toBe("degraded");
    expect(deriveWorkerHealthStatus({ marketStreamFreshness: "fresh", positionManagementStatus: "degraded", researchScheduleStatus: "scheduled" })).toBe("degraded");
    expect(deriveWorkerHealthStatus({ marketStreamFreshness: "fresh", positionManagementStatus: "ready", researchScheduleStatus: "scheduled", telegramEnabled: true, telegramStatus: "blocked" })).toBe("degraded");
    expect(deriveWorkerHealthStatus({ marketStreamFreshness: "fresh", positionManagementStatus: "ready", researchScheduleStatus: "scheduled" })).toBe("healthy");
  });

  it("reports external integrations as disabled", () => {
    const now = new Date("2026-08-21T00:00:00.000Z");

    expect(getWorkerHealth(now, {})).toEqual({
      alpaca: "not_configured",
      asOf: "2026-08-21T00:00:00.000Z",
      brokerConnectionEnabled: false,
      database: "not_configured",
      durableScheduler: { activationApprovalReferencePresent: true, auditActivationApprovalReferencePresent: false, auditEnabled: false, cron: "0 0 * * *", enabled: false, status: "disabled", timezone: "UTC" },
      globalKillSwitchActive: false,
      marketStream: { reconnectCount: 0, status: "disabled" },
      operatingMode: "observe",
      paperAutopilotOrderSubmissionEnabled: false,
      paperAutopilotOrderSubmissionApprovalReferencePresent: true,
      positionManagement: { blockedReasons: [], enabled: false, intervalSeconds: 60, readiness: "disabled", status: "disabled" },
      researchSchedule: { enabled: false, handlerEnabled: false, status: "disabled" },
      shadowEvaluation: { enabled: false, intervalSeconds: 3600, sourceConfigured: false, status: "disabled" },
      service: "worker",
      telegramAlerts: { deliveryVerification: "unverified", enabled: false, riskDecisionAlerts: "approved_only", routineCooldownHours: 24, status: "disabled" },
      telegramAlertTest: { approvalReferencePresent: false, status: "blocked" },
      telegramAssistant: { enabled: false, mode: "read_only", pollSeconds: 20, status: "disabled" },
      status: "healthy",
    });
  });

  it("reports a non-secret hosting release identifier when supplied", () => {
    expect(getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), { RAILWAY_GIT_COMMIT_SHA: "abc123" }).release).toBe("abc123");
  });

  it("accepts a bounded explicitly managed release identity", () => {
    expect(getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), { PAPERTRADER_RELEASE: "managed-release" }).release).toBe("managed-release");
  });

  it("reports configuration presence separately from broker connection enablement", () => {
    const health = getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), {
      ALPACA_API_KEY: "paper-key",
      ALPACA_SECRET_KEY: "paper-secret",
      ALPACA_PAPER_TRADE: "true",
      BROKER_CONNECTION_ENABLED: "false",
      DATABASE_URL: "postgres://private",
      DURABLE_SCHEDULER_AUDIT_ACTIVATION_APPROVAL_REFERENCE: "scheduler-audit-activate-001",
      DURABLE_SCHEDULER_AUDIT_ENABLED: "true",
      TRADING_MODE: "paper",
    });
    expect(health).toMatchObject({ alpaca: "configured", brokerConnectionEnabled: false, database: "configured", durableScheduler: { auditActivationApprovalReferencePresent: true, auditEnabled: true }, operatingMode: "observe" });
  });

  it("reports the configured daily UTC schedule without activating it", () => {
    expect(getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), { DAILY_PREPARATION_CRON: "30 2 * * *" }).durableScheduler).toMatchObject({ cron: "30 2 * * *", enabled: false, status: "disabled", timezone: "UTC" });
  });

  it("reports Telegram readiness without exposing configuration values", () => {
    expect(getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), {
      TELEGRAM_ALERTS_ENABLED: "true",
      TELEGRAM_BOT_TOKEN: "123456:ABC_def-123",
      TELEGRAM_CHAT_ID: "-1001234567890",
    }).telegramAlerts).toEqual({ deliveryVerification: "unverified", enabled: true, riskDecisionAlerts: "approved_only", routineCooldownHours: 24, status: "ready" });
    expect(getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), {
      TELEGRAM_ALERTS_ENABLED: "true",
    }).telegramAlerts).toEqual({ deliveryVerification: "unverified", enabled: true, riskDecisionAlerts: "approved_only", routineCooldownHours: 24, status: "blocked" });
  });

  it("reports the no-send Telegram test preflight without exposing its reference", () => {
    expect(getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), {
      TELEGRAM_ALERTS_ENABLED: "true",
      TELEGRAM_BOT_TOKEN: "123456:ABC_def-123",
      TELEGRAM_CHAT_ID: "-1001234567890",
      TELEGRAM_ALERT_TEST_APPROVAL_REFERENCE: "telegram-review-123",
    }).telegramAlertTest).toEqual({ approvalReferencePresent: true, status: "ready" });
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
