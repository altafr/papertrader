import { describe, expect, it } from "vitest";

import { formatUtc, getFreshnessLabel, getFreshnessState, parseAgentRuns, parseOperationsHealth } from "./dashboard-state";

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
        globalKillSwitchActive: false,
        operatingMode: "observe",
        paperAutopilotEnabled: false,
        migration: { blockedReasons: [], status: "ready" },
        riskPolicy: { initialEquityBaseline: "1000", maxSingleTradeRiskPercent: "0.25", maxSingleTradeRiskUsd: "100" },
        researchSchedule: { enabled: false, handlerEnabled: false, status: "disabled" },
        scheduler: { enabled: false, status: "disabled" },
      },
    });
    expect(health?.runtime.scheduler.status).toBe("disabled");
    expect(parseOperationsHealth({ reconciliation: { status: "fresh" }, runtime: {} })).toBeUndefined();
    expect(parseOperationsHealth({
      reconciliation: { status: "fresh" },
      runtime: {
        brokerConnectionEnabled: false,
        dailyPreparationHandlerEnabled: false,
        globalKillSwitchActive: false,
        operatingMode: "observe",
        paperAutopilotEnabled: false,
        migration: { blockedReasons: ["unexpected_reason"], status: "blocked" },
        riskPolicy: { initialEquityBaseline: "1000", maxSingleTradeRiskPercent: "0.25", maxSingleTradeRiskUsd: "100" },
        researchSchedule: { enabled: false, handlerEnabled: false, status: "disabled" },
        scheduler: { enabled: false, status: "disabled" },
      },
    })).toBeUndefined();
  });

  it("accepts bounded agent-run metadata and rejects malformed status or refs", () => {
    const runs = parseAgentRuns({ runs: [{ agentType: "stock_research", artifact: { confidence: "not_calibrated", evidenceRefs: ["bars:1"], schemaVersion: "1", type: "research_watchlist" }, createdAt: "2026-08-23T00:00:00.000Z", inputRefs: ["bars:1"], promptVersion: "research@1", runId: "run-1", status: "succeeded", task: "Rank stocks." }] });
    expect(runs?.[0]?.artifact?.type).toBe("research_watchlist");
    expect(parseAgentRuns({ runs: [{ agentType: "stock_research", createdAt: "now", inputRefs: ["bars:1"], promptVersion: "research@1", runId: "run-1", status: "unknown", task: "Rank stocks." }] })).toBeUndefined();
    expect(parseAgentRuns({ runs: [{ agentType: "stock_research", createdAt: "now", inputRefs: [1], promptVersion: "research@1", runId: "run-1", status: "queued", task: "Rank stocks." }] })).toBeUndefined();
  });
});
