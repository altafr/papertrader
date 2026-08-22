import { describe, expect, it } from "vitest";
import { createImmutablePaperSignal } from "./paper-risk.js";
import { approvePaperTradeIntent, createImmutablePaperTradeIntent, createPaperTradeApprovalStore } from "./trade-intent.js";
import { crossSectionalMomentum } from "./strategies.js";

const signal = createImmutablePaperSignal({ candidate: { assetClass: "us_equity", expiresAt: "2026-01-11T00:00:00Z", plannedExitPrice: "110", plannedStopPrice: "99", proposedEntryPrice: "100", rationale: "fixture", score: "1", signalTime: "2026-01-10T00:00:00Z", side: "long", strategyKey: crossSectionalMomentum.key, strategyVersion: crossSectionalMomentum.version, symbol: "AAA" }, createdAt: "2026-01-10T00:01:00Z", signalId: "signal-1" });
const intent = createImmutablePaperTradeIntent({ createdAt: "2026-01-10T00:02:00Z", estimatedFees: "0.01", estimatedSlippage: "0.01", intentId: "intent-1", quantity: "0.02", signal });
const state = { accountBaselineVerified: true, accountFresh: true, dataFresh: true, killSwitchActive: false, openPositions: [], submittedEntriesLast24Hours: 0 };

describe("immutable paper trade intents", () => {
  it("re-evaluates current state and creates an approval record", () => {
    const approval = approvePaperTradeIntent({ approvedAt: "2026-01-10T00:03:00Z", currentAt: "2026-01-10T00:03:00Z", equity: "1000", intent, state });
    expect(approval).toMatchObject({ intentId: "intent-1", policyVersion: "paper-risk-v1", status: "approved" });
    expect(Object.isFrozen(intent)).toBe(true);
  });

  it("rejects expired intents and records each intent at most once", () => {
    const approval = approvePaperTradeIntent({ approvedAt: "2026-01-12T00:00:00Z", currentAt: "2026-01-12T00:00:00Z", equity: "1000", intent, state });
    expect(approval.status).toBe("rejected");
    expect(approval.assessment.reasons).toContain("Trade intent has expired.");
    const store = createPaperTradeApprovalStore();
    store.append(approval);
    expect(() => store.append(approval)).toThrow("already has an approval");
  });

  it("fails closed for invalid intent quantities", () => {
    expect(() => createImmutablePaperTradeIntent({ createdAt: "2026-01-10T00:02:00Z", estimatedFees: "0", estimatedSlippage: "0", intentId: "intent-2", quantity: "0", signal })).toThrow("positive decimal");
  });
});
