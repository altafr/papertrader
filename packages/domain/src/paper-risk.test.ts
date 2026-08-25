import { describe, expect, it } from "vitest";
import { assessPaperRisk, createImmutablePaperSignal, DEFAULT_PAPER_RISK_POLICY, PAPER_INITIAL_EQUITY_BASELINE } from "./paper-risk.js";
import { crossSectionalMomentum } from "./strategies.js";

const candidate = { assetClass: "us_equity" as const, expiresAt: "2026-01-11T00:00:00Z", plannedExitPrice: "110", plannedStopPrice: "99", proposedEntryPrice: "100", rationale: "fixture", score: "1", signalTime: "2026-01-10T00:00:00Z", side: "long" as const, strategyKey: crossSectionalMomentum.key, strategyVersion: crossSectionalMomentum.version, symbol: "AAA" };
const signal = createImmutablePaperSignal({ candidate, createdAt: "2026-01-10T00:01:00Z", signalId: "signal-1" });
const state = { accountBaselineVerified: true, accountFresh: true, dataFresh: true, killSwitchActive: false, openPositions: [], submittedEntriesLast24Hours: 0 };

describe("paper signals and deterministic risk", () => {
  it("locks the initial paper baseline at Alpaca's USD 100,000 default", () => {
    expect(PAPER_INITIAL_EQUITY_BASELINE).toBe("100000");
    expect(DEFAULT_PAPER_RISK_POLICY.initialEquityBaseline).toBe(PAPER_INITIAL_EQUITY_BASELINE);
  });

  it("freezes a signal and passes a bounded low-risk proposal", () => {
    expect(Object.isFrozen(signal)).toBe(true);
    const result = assessPaperRisk({ estimatedFees: "0.01", estimatedSlippage: "0.01", equity: "1000", quantity: "0.02", signal, state });
    expect(result.passes).toBe(true);
    expect(result.estimatedLoss).toBe("0.04000000");
  });

  it("rejects stale state, kill switch, risk, and exposure violations", () => {
    const result = assessPaperRisk({ estimatedFees: "0", estimatedSlippage: "0", equity: "1000", quantity: "10", signal, state: { ...state, accountFresh: false, dataFresh: false, killSwitchActive: true } });
    expect(result.passes).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining(["Account state is stale.", "Market data is stale.", "Global kill switch is active.", "Proposed position exceeds the gross-exposure cap."]));
  });

  it("fails closed when the baseline is not verified", () => {
    const result = assessPaperRisk({ estimatedFees: "0", estimatedSlippage: "0", equity: "1000", quantity: "0.01", signal, state: { ...state, accountBaselineVerified: false } });
    expect(result.passes).toBe(false);
    expect(result.reasons[0]).toContain("baseline");
  });

  it("rejects a long stop more than 5% below entry", () => {
    const signal = createImmutablePaperSignal({
      candidate: { ...candidate, plannedStopPrice: "94" },
      createdAt: "2026-01-10T00:01:00Z",
      signalId: "signal-stop-distance",
    });
    const result = assessPaperRisk({ estimatedFees: "0", estimatedSlippage: "0", equity: "100000", quantity: "1", signal, state });
    expect(result.passes).toBe(false);
    expect(result.reasons).toContain("Planned stop exceeds the maximum 5% adverse-loss distance.");
  });
});
