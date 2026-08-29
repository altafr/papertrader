import { describe, expect, it } from "vitest";

import { combinePaperAutopilotRuntimeReadiness, assessRuntimeReconciliation } from "./paper-autopilot-runtime-readiness.js";
import { getPaperAutopilotReadiness } from "./paper-autopilot-readiness.js";

describe("paper autopilot runtime readiness", () => {
  it("classifies missing, fresh, delayed, and stale reconciliation captures", () => {
    const now = new Date("2026-08-23T00:00:00.000Z");
    expect(assessRuntimeReconciliation(undefined, now)).toEqual({ status: "unavailable" });
    expect(assessRuntimeReconciliation("2026-08-21T22:00:00.000Z", now).status).toBe("fresh");
    expect(assessRuntimeReconciliation("2026-08-21T00:00:00.000Z", now).status).toBe("delayed");
    expect(assessRuntimeReconciliation("2026-08-20T00:00:00.000Z", now).status).toBe("stale");
  });

  it("does not turn disabled configuration into a ready runtime", () => {
    const result = combinePaperAutopilotRuntimeReadiness(getPaperAutopilotReadiness({}), assessRuntimeReconciliation("2026-08-23T00:00:00.000Z", new Date("2026-08-23T00:00:00.000Z")));
    expect(result.status).toBe("disabled");
    expect(result.blockedReasons).toEqual([]);
  });

  it("blocks runtime readiness when autopilot is configured but order submission is still dry-run", () => {
    const configuration = getPaperAutopilotReadiness({
      ALPACA_API_KEY: "key",
      ALPACA_SECRET_KEY: "secret",
      ALPACA_PAPER_TRADE: "true",
      BROKER_CONNECTION_ENABLED: "true",
      DAILY_PREPARATION_HANDLER_ENABLED: "true",
      DATABASE_URL: "postgres://example",
      DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE: "scheduler-1",
      DURABLE_SCHEDULER_ENABLED: "true",
      OPERATING_MODE: "paper_autopilot",
      PAPER_AUTOPILOT_ENABLED: "true",
      PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED: "false",
      TRADING_MODE: "paper",
    });
    const result = combinePaperAutopilotRuntimeReadiness(configuration, { status: "fresh", ageSeconds: 10, capturedAt: "2026-08-23T00:00:00.000Z" });
    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toContain("paper_order_submission_disabled");
  });
});
