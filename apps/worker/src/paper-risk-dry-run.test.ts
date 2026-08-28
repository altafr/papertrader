import { describe, expect, it } from "vitest";
import { assessResearchCandidateRisk, buildRiskCandidate, isPaperBaselineVerified } from "./paper-risk-dry-run.js";

const candidate = { assetClass: "us_equity" as const, averageVolume: "1000", dataAsOf: "2026-08-25T23:00:00.000Z", marketSnapshot: { asOf: "2026-08-25T23:00:00.000Z", atr14: null, close: "100.00000000", ema20: null, ema50: null, relativeVolume20: null, rsi14: null, volume: "1000" }, momentumReturn: "0.10", symbol: "AAA" };
const state = { accountBaselineVerified: true, accountFresh: true, dataFresh: true, killSwitchActive: false, openPositions: [], submittedEntriesLast24Hours: 0 } as const;

describe("paper risk dry run", () => {
  it("verifies the documented baseline within a one-dollar reconciliation tolerance", () => {
    expect(isPaperBaselineVerified("100000.50")).toBe(true);
    expect(isPaperBaselineVerified("99998.99")).toBe(false);
  });

  it("builds a 5% stop candidate and approves a bounded one-share intent", () => {
    expect(buildRiskCandidate(candidate, new Date("2026-08-26T00:00:00.000Z"))).toMatchObject({ plannedStopPrice: "95.00000000", side: "long" });
    const result = assessResearchCandidateRisk({ candidate, currentAt: "2026-08-26T00:00:00.000Z", equity: "100000", quantity: "1", state });
    expect(result.approval.status).toBe("approved");
    expect(result.approval.assessment.estimatedLossPercent).toBe("5.00000000");
  });

  it("keeps a stale or killed candidate rejected", () => {
    const result = assessResearchCandidateRisk({ candidate, currentAt: "2026-08-26T00:00:00.000Z", equity: "100000", quantity: "1", state: { ...state, accountFresh: false, killSwitchActive: true } });
    expect(result.approval.status).toBe("rejected");
    expect(result.approval.assessment.reasons).toEqual(expect.arrayContaining(["Account state is stale.", "Global kill switch is active."]));
  });
});
