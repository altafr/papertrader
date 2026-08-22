import { describe, expect, it } from "vitest";
import { assessPaperPromotion } from "./paper-promotion.js";

const evidence = { closedTrades: 20, consecutiveCalendarDays: 30, duplicateOrderCount: 0, maxDrawdownPercent: "4.99", positiveTrades: 11, riskViolationCount: 0, staleDataBreachCount: 0, strategyKey: "s", strategyVersion: "1.0.0" };

describe("paper promotion evidence", () => {
  it("passes deterministic readiness checks but remains non-promoting", () => {
    expect(assessPaperPromotion(evidence)).toMatchObject({ automatedChecksPass: true, promotable: false });
  });

  it("rejects insufficient duration, drawdown, stale data, risk, and duplicate events", () => {
    const result = assessPaperPromotion({ ...evidence, consecutiveCalendarDays: 29, duplicateOrderCount: 1, maxDrawdownPercent: "5.01", riskViolationCount: 1, staleDataBreachCount: 1 });
    expect(result.automatedChecksPass).toBe(false);
    expect(result.reasons).toHaveLength(6);
  });
});
