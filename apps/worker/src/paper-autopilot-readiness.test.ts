import { describe, expect, it } from "vitest";

import { getPaperAutopilotReadiness } from "./paper-autopilot-readiness.js";

describe("paper autopilot readiness", () => {
  it("is disabled by default and reports no activation reasons", () => {
    expect(getPaperAutopilotReadiness({})).toMatchObject({ status: "disabled", blockedReasons: [], policy: { initialEquityBaseline: "100000", maxSingleTradeRiskPercentOfNotional: "5", maxSingleTradeStopLossPercent: "5" } });
  });

  it("reports bounded missing-gate reasons without exposing credentials", () => {
    const result = getPaperAutopilotReadiness({ ALPACA_API_KEY: "secret-key", PAPER_AUTOPILOT_ENABLED: "true", TRADING_MODE: "paper" });
    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining(["paper_credentials_not_configured", "broker_connection_disabled", "database_not_configured", "durable_scheduler_disabled"]));
    expect(JSON.stringify(result)).not.toContain("secret-key");
  });

  it("reports configuration-ready only when every explicit deployment gate is set", () => {
    expect(getPaperAutopilotReadiness({ ALPACA_API_KEY: "key", ALPACA_SECRET_KEY: "secret", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "true", DAILY_PREPARATION_HANDLER_ENABLED: "true", DATABASE_URL: "postgres://redacted", DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE: "scheduler-review-123", DURABLE_SCHEDULER_ENABLED: "true", PAPER_AUTOPILOT_ENABLED: "true", OPERATING_MODE: "paper_autopilot", TRADING_MODE: "paper" })).toMatchObject({ status: "ready", blockedReasons: [], checks: { runtimeFreshnessGateRequired: true, schedulerActivationApprovalReferencePresent: true } });
  });

  it("blocks configuration readiness while the global kill switch is active", () => {
    const result = getPaperAutopilotReadiness({ ALPACA_API_KEY: "key", ALPACA_SECRET_KEY: "secret", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "true", DAILY_PREPARATION_HANDLER_ENABLED: "true", DATABASE_URL: "postgres://redacted", DURABLE_SCHEDULER_ENABLED: "true", GLOBAL_KILL_SWITCH_ACTIVE: "true", PAPER_AUTOPILOT_ENABLED: "true", OPERATING_MODE: "paper_autopilot", TRADING_MODE: "paper" });
    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toContain("global_kill_switch_active");
    expect(result.checks.globalKillSwitchActive).toBe(true);
    expect(result.blockedReasons).toContain("scheduler_activation_approval_reference_missing");
  });
});
