import { describe, expect, it } from "vitest";

import { buildPaperRiskDecisionMessage, selectPaperAutopilotCandidates, shouldNotifyPaperRiskDecision } from "./paper-autopilot-cycle.js";

describe("paper autopilot candidate bound", () => {
  const candidates = Array.from({ length: 12 }, (_, index) => `candidate-${index + 1}`);

  it("evaluates a bounded set before selecting at most one order", () => {
    expect(selectPaperAutopilotCandidates(candidates, true)).toEqual(candidates.slice(0, 10));
  });

  it("keeps dry-run visibility bounded at ten candidates", () => {
    expect(selectPaperAutopilotCandidates(candidates, false)).toHaveLength(10);
  });
});

describe("paper risk notification policy", () => {
  it("notifies selected approvals but keeps rejected decisions in the audit log only", () => {
    expect(shouldNotifyPaperRiskDecision("approved")).toBe(true);
    expect(shouldNotifyPaperRiskDecision("rejected")).toBe(false);
  });

  it("includes bounded entry rationale and indicator evidence", () => {
    const message = buildPaperRiskDecisionMessage({ approvalReference: "paper-001", candidate: { assetClass: "crypto", averageVolume: "10", dataAsOf: "2026-08-29T00:00:00Z", marketSnapshot: { asOf: "2026-08-29T00:00:00Z", atr14: "2", close: "100", ema20: "99", ema50: "98", relativeVolume20: "1.4", rsi14: "61", volume: "10" }, momentumReturn: "0.03", symbol: "BTC/USD" }, entryPrice: "100", plannedStopPrice: "95", plannedTargetPrice: "104", timeStopAt: "2026-08-30T00:00:00.000Z" });
    expect(message).toContain("Paper entry selected: BTC/USD");
    expect(message).toContain("RSI14 61");
    expect(message).toContain("stop 95, target 104");
    expect(message).toContain("time stop 2026-08-30T00:00:00.000Z");
    expect(message.length).toBeLessThanOrEqual(900);
  });
});
