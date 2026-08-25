import { describe, expect, it } from "vitest";

import { formatUtc, getFreshnessLabel, getFreshnessState, parseAgentRuns, parseOperatorOverview, parseOperationsHealth } from "./dashboard-state";

describe("dashboard state", () => {
  it("classifies persisted data by freshness", () => {
    expect(getFreshnessState(30)).toBe("fresh");
    expect(getFreshnessState(600)).toBe("delayed");
    expect(getFreshnessState(901)).toBe("stale");
    expect(getFreshnessState(Number.NaN)).toBe("stale");
    expect(getFreshnessLabel("delayed")).toBe("Delayed");
  });

  it("formats UTC capture timestamps without inventing local time", () => {
    expect(formatUtc("2026-08-22T01:02:03.000Z")).toBe("2026-08-22 01:02:03 UTC");
    expect(formatUtc("not-a-date")).toBe("Unavailable");
  });

  it("accepts only the redacted operations-health contract", () => {
    const health = parseOperationsHealth({
      reconciliation: { ageSeconds: 30, capturedAt: "2026-08-23T00:00:00.000Z", status: "fresh" },
      runtime: {
        brokerConnectionEnabled: false,
        dailyPreparationHandlerEnabled: false,
        dailyReconciliation: { capturedAt: "2026-08-23T00:00:00.000Z", status: "completed" },
        schedulerAudit: { completedAt: "2026-08-23T00:00:10.000Z", runId: "run-1", scheduledAt: "2026-08-23T00:00:00.000Z", startedAt: "2026-08-23T00:00:01.000Z", status: "completed" },
        schedulerAuditGate: { activationApprovalReferencePresent: true, enabled: false, migrationReady: true, status: "disabled" },
        recovery: { status: "unverified" },
        globalKillSwitchActive: false,
        operatingMode: "observe",
        paperAutopilotEnabled: false,
        migration: { blockedReasons: [], status: "ready" },
        riskPolicy: { initialEquityBaseline: "100000", maxSingleTradeRiskPercentOfNotional: "5", maxSingleTradeStopLossPercent: "5" },
        researchSchedule: { enabled: false, handlerEnabled: false, status: "disabled" },
        scheduler: { activationApprovalReferencePresent: true, cron: "0 0 * * *", enabled: false, status: "disabled", timezone: "UTC" },
        telegramAlerts: { deliveryVerification: "unverified", enabled: false, status: "disabled" },
        telegramAlertTest: { approvalReferencePresent: false, status: "blocked" },
      },
    });
    expect(health?.runtime.scheduler.status).toBe("disabled");
    expect(health?.runtime.scheduler.activationApprovalReferencePresent).toBe(true);
    expect(health?.runtime.dailyPreparationHandlerEnabled).toBe(false);
    expect(health?.runtime.schedulerAudit.status).toBe("completed");
    expect(health?.runtime.schedulerAuditGate.status).toBe("disabled");
    expect(parseOperationsHealth({ reconciliation: { status: "fresh" }, runtime: {} })).toBeUndefined();
    expect(parseOperationsHealth({
      reconciliation: { status: "fresh" },
      runtime: {
        brokerConnectionEnabled: false,
        dailyPreparationHandlerEnabled: false,
        dailyReconciliation: { status: "unavailable" },
        schedulerAudit: { status: "unavailable" },
        schedulerAuditGate: { activationApprovalReferencePresent: true, enabled: false, migrationReady: false, status: "disabled" },
        recovery: { status: "unverified" },
        globalKillSwitchActive: false,
        operatingMode: "observe",
        paperAutopilotEnabled: false,
        migration: { blockedReasons: ["unexpected_reason"], status: "blocked" },
        riskPolicy: { initialEquityBaseline: "100000", maxSingleTradeRiskPercentOfNotional: "5", maxSingleTradeStopLossPercent: "5" },
        researchSchedule: { enabled: false, handlerEnabled: false, status: "disabled" },
        scheduler: { activationApprovalReferencePresent: true, cron: "0 0 * * *", enabled: false, status: "disabled", timezone: "UTC" },
        telegramAlerts: { deliveryVerification: "unverified", enabled: false, status: "disabled" },
        telegramAlertTest: { approvalReferencePresent: false, status: "blocked" },
      },
    })).toBeUndefined();
  });

  it("accepts bounded agent-run metadata and rejects malformed status or refs", () => {
    const runs = parseAgentRuns({ runs: [{ agentType: "stock_research", artifact: { confidence: "not_calibrated", evidenceRefs: ["bars:1"], schemaVersion: "1", type: "research_watchlist" }, createdAt: "2026-08-23T00:00:00.000Z", inputRefs: ["bars:1"], promptVersion: "research@1", runId: "run-1", status: "succeeded", task: "Rank stocks." }] });
    expect(runs?.[0]?.artifact?.type).toBe("research_watchlist");
    expect(parseAgentRuns({ runs: [{ agentType: "stock_research", createdAt: "now", inputRefs: ["bars:1"], promptVersion: "research@1", runId: "run-1", status: "unknown", task: "Rank stocks." }] })).toBeUndefined();
    expect(parseAgentRuns({ runs: [{ agentType: "stock_research", createdAt: "now", inputRefs: [1], promptVersion: "research@1", runId: "run-1", status: "queued", task: "Rank stocks." }] })).toBeUndefined();
  });

  it("preserves complete audit totals for the coverage summary", () => {
    const overview = parseOperatorOverview({ agents: [], filteredTrades: [], tradeDecisions: [], strategyLifecycle: [], strategyCatalog: [], auditTimeline: [], history: { page: 1, limit: 100, hasNext: false, totals: { agents: 2, filteredTrades: 3, submissions: 4, lifecycle: 5, schedules: 6 } } });
    expect(overview?.history?.totals).toEqual({ agents: 2, filteredTrades: 3, submissions: 4, lifecycle: 5, schedules: 6 });
  });
});
