import { describe, expect, it } from "vitest";

import { combineFullPaperAutonomousReadiness } from "./full-paper-autonomous-readiness.js";

const performance = { calendarDays: 30, consecutiveCalendarDays: 30, snapshotCount: 30, stability: { blockedReasons: [], status: "ready" as const }, status: "ready" as const };
const runtime = { blockedReasons: [], configuration: { blockedReasons: [], checks: {} as never, executionStatus: "enabled" as const, policy: { initialEquityBaseline: "100000", maxSingleTradeRiskPercentOfNotional: "5", maxSingleTradeStopLossPercent: "5" }, status: "ready" as const }, reconciliation: { status: "fresh" as const }, status: "ready" as const };

describe("combineFullPaperAutonomousReadiness", () => {
  it("is ready only when every release gate passes", () => {
    expect(combineFullPaperAutonomousReadiness({ runtime, positionCoverage: { positionCount: 1, unmanagedCount: 0 }, alerts: { enabled: true, configured: true, deliveryVerified: true }, performance })).toMatchObject({ evidence: { consecutiveCalendarDays: 30, daysRemaining: 0, requiredConsecutiveCalendarDays: 30 }, gates: { exitPlanCoverage: "complete", telegramAlerts: "verified", paperEvidence: "ready" }, status: "ready" });
  });

  it("fails closed with actionable gate reasons", () => {
    const result = combineFullPaperAutonomousReadiness({ runtime, positionCoverage: { positionCount: 2, unmanagedCount: 1 }, alerts: { enabled: true, configured: true, deliveryVerified: false }, performance: { ...performance, consecutiveCalendarDays: 1, calendarDays: 1, stability: { blockedReasons: ["minimum_30_consecutive_calendar_days_not_met"], status: "blocked" } } });
    expect(result.status).toBe("blocked");
    expect(result.evidence.daysRemaining).toBe(29);
    expect(result.blockedReasons).toEqual(["unmanaged_positions_present", "telegram_alert_delivery_unverified", "minimum_30_consecutive_calendar_days_not_met"]);
  });
});
