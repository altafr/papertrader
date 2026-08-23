import { describe, expect, it } from "vitest";

import { getDurableOneRunReadiness } from "./durable-one-run-readiness.js";

describe("durable one-run readiness", () => {
  it("reports bounded missing-gate reasons without exposing values", () => {
    const result = getDurableOneRunReadiness({});
    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining(["run_once_disabled", "approval_reference_missing_or_invalid", "broker_connection_disabled"]));
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("reports ready only for a fully gated temporary one-run", () => {
    expect(getDurableOneRunReadiness({ ALPACA_API_KEY: "key", ALPACA_SECRET_KEY: "secret", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "true", DAILY_PREPARATION_HANDLER_ENABLED: "true", DATABASE_URL: "postgres://redacted", DURABLE_SCHEDULER_APPROVAL_REFERENCE: "ticket-123", DURABLE_SCHEDULER_ONCE: "true", PAPER_AUTOPILOT_ENABLED: "false", TRADING_MODE: "paper" })).toMatchObject({ approvalReferencePresent: true, blockedReasons: [], status: "ready" });
  });

  it("blocks an otherwise ready one-run when the kill switch is active", () => {
    const result = getDurableOneRunReadiness({ ALPACA_API_KEY: "key", ALPACA_SECRET_KEY: "secret", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "true", DAILY_PREPARATION_HANDLER_ENABLED: "true", DATABASE_URL: "postgres://redacted", DURABLE_SCHEDULER_APPROVAL_REFERENCE: "ticket-123", DURABLE_SCHEDULER_ONCE: "true", GLOBAL_KILL_SWITCH_ACTIVE: "true", PAPER_AUTOPILOT_ENABLED: "false", TRADING_MODE: "paper" });
    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toContain("global_kill_switch_active");
  });
});
