import { describe, expect, it } from "vitest";
import { assessPaperRisk, classifyPaperBaseline, createImmutablePaperSignal, DEFAULT_PAPER_RISK_POLICY, PAPER_INITIAL_EQUITY_BASELINE } from "./paper-risk.js";
import { crossSectionalMomentum } from "./strategies.js";

const candidate = { assetClass: "us_equity" as const, expiresAt: "2026-01-11T00:00:00Z", plannedExitPrice: "110", plannedStopPrice: "99", proposedEntryPrice: "100", rationale: "fixture", score: "1", signalTime: "2026-01-10T00:00:00Z", side: "long" as const, strategyKey: crossSectionalMomentum.key, strategyVersion: crossSectionalMomentum.version, symbol: "AAA" };
const signal = createImmutablePaperSignal({ candidate, createdAt: "2026-01-10T00:01:00Z", signalId: "signal-1" });
const state = { accountBaselineVerified: true, accountFresh: true, dataFresh: true, killSwitchActive: false, openPositions: [], submittedEntriesLast24Hours: 0 };

describe("paper signals and deterministic risk", () => {
  it("classifies baseline status without returning account values", () => {
    expect(classifyPaperBaseline("100000.50")).toBe("within_tolerance");
    expect(classifyPaperBaseline("1000")).toBe("below_baseline");
    expect(classifyPaperBaseline("not-a-number")).toBe("unavailable");
  });
  it("locks the initial paper baseline at Alpaca's USD 100,000 default", () => {
    expect(PAPER_INITIAL_EQUITY_BASELINE).toBe("100000");
    expect(DEFAULT_PAPER_RISK_POLICY.initialEquityBaseline).toBe(PAPER_INITIAL_EQUITY_BASELINE);
    expect(DEFAULT_PAPER_RISK_POLICY.minPositionPercent).toBe("2");
  });

  it("rejects a trade below the two-percent portfolio minimum", () => {
    const result = assessPaperRisk({ estimatedFees: "0", estimatedSlippage: "0", equity: "1000", quantity: "0.01", signal, state });
    expect(result.passes).toBe(false);
    expect(result.reasons).toContain("Proposed position is below the minimum 2% of portfolio investment.");
  });

  it("permits crypto only when restart-safe synthetic bracket protection is enabled", () => {
    const cryptoSignal = createImmutablePaperSignal({ candidate: { ...candidate, assetClass: "crypto" }, createdAt: "2026-01-10T00:01:00Z", signalId: "signal-crypto" });
    const blocked = assessPaperRisk({ estimatedFees: "0", estimatedSlippage: "0", equity: "100000", quantity: "20", signal: cryptoSignal, state });
    expect(blocked.reasons).toContain("Alpaca crypto entries require a bracket-capable adapter; entry rejected until synthetic bracket protection is enabled.");
    const allowed = assessPaperRisk({ estimatedFees: "0", estimatedSlippage: "0", equity: "100000", quantity: "20", signal: cryptoSignal, state: { ...state, cryptoSyntheticBracketEnabled: true } });
    expect(allowed.passes).toBe(true);
  });

  it("freezes a signal and passes a bounded low-risk proposal", () => {
    expect(Object.isFrozen(signal)).toBe(true);
    const result = assessPaperRisk({ estimatedFees: "0.01", estimatedSlippage: "0.01", equity: "1000", quantity: "0.2", signal, state });
    expect(result.passes).toBe(true);
    expect(result.estimatedLoss).toBe("0.22000000");
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

  it("pauses new entries while an existing position lacks exit-plan coverage", () => {
    const result = assessPaperRisk({ estimatedFees: "0", estimatedSlippage: "0", equity: "1000", quantity: "0.01", signal, state: { ...state, unmanagedPositions: ["PFD"] } });
    expect(result.passes).toBe(false);
    expect(result.reasons).toContain("Existing positions lack complete exit plans; new entries are paused until portfolio coverage is restored.");
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
