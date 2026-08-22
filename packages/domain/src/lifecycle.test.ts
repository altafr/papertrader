import { describe, expect, it } from "vitest";
import { createStrategyLifecycleStore } from "./lifecycle.js";
import { assessReplayPromotion, runRegimeReplay } from "./research.js";
import { crossSectionalMomentum } from "./strategies.js";
import { assessShadowPromotion } from "./shadow-promotion.js";
import type { StrategyBar } from "./strategy.js";

const bars: readonly StrategyBar[] = Array.from({ length: 6 }, (_, index) => ({
  symbol: "AAA", timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString(), open: String(100 + index), high: String(100 + index), low: String(100 + index), close: String(100 + index), volume: "100",
}));
const evidence = runRegimeReplay({
  defaultNotional: "100", estimatedFeesPerTrade: "0", initialEquity: "1000", parameters: crossSectionalMomentum.parameters.validate({ lookbackBars: 2 }),
  regimes: ["bull", "bear", "choppy"].map((regime) => ({ name: regime, regime: regime as "bull" | "bear" | "choppy", bars: [...bars, ...bars.map((bar, index) => ({ ...bar, symbol: "BBB", timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString() }))] })),
  slippageBps: "0", strategy: crossSectionalMomentum,
});

describe("strategy lifecycle records", () => {
  it("starts disabled and records an approved disabled-to-replay transition", () => {
    const store = createStrategyLifecycleStore(crossSectionalMomentum);
    const assessment = assessReplayPromotion(evidence, { maxDrawdownPercent: "100", minimumPositiveRegimes: 0, minimumTrades: 0 });
    const record = store.transition({ actorId: "operator-1", approval: { approvedAt: "2026-01-10T00:00:00Z", approvedBy: "operator-1", note: "Reviewed replay evidence." }, automatedChecksPass: assessment.automatedChecksPass, evidence, reason: "Replay review approved.", requestedAt: "2026-01-10T00:00:00Z", strategyKey: crossSectionalMomentum.key, strategyVersion: crossSectionalMomentum.version, toStage: "replay" });
    expect(record.stage).toBe("replay"); expect(record.revision).toBe(1); expect(record.events[0]?.eventId).toContain("#1");
  });

  it("rejects missing approval, failed checks, mismatched evidence, and later-stage jumps", () => {
    const store = createStrategyLifecycleStore(crossSectionalMomentum);
    const base = { evidence, reason: "test", requestedAt: "2026-01-10T00:00:00Z", strategyKey: crossSectionalMomentum.key, strategyVersion: crossSectionalMomentum.version, toStage: "replay" as const, actorId: "operator-1" };
    expect(() => store.transition(base)).toThrow("approval");
    expect(() => store.transition({ ...base, approval: { approvedAt: base.requestedAt, approvedBy: base.actorId, note: "ok" } })).toThrow("automated checks");
    expect(() => store.transition({ ...base, toStage: "shadow", approval: { approvedAt: base.requestedAt, approvedBy: base.actorId, note: "ok" }, automatedChecksPass: true })).toThrow("Invalid strategy stage transition");
    expect(() => store.transition({ ...base, evidence: { ...evidence, strategyVersion: "9.9.9" }, approval: { approvedAt: base.requestedAt, approvedBy: base.actorId, note: "ok" }, automatedChecksPass: true })).toThrow("match the strategy version");
  });

  it("does not mutate the original record after a transition", () => {
    const store = createStrategyLifecycleStore(crossSectionalMomentum);
    const before = store.get();
    expect(() => store.transition({ actorId: "operator-1", approval: { approvedAt: "2026-01-10T00:00:00Z", approvedBy: "operator-1", note: "Reviewed." }, automatedChecksPass: true, evidence, reason: "Replay.", requestedAt: "2026-01-10T00:00:00Z", strategyKey: crossSectionalMomentum.key, strategyVersion: crossSectionalMomentum.version, toStage: "replay" })).not.toThrow();
    expect(before.stage).toBe("disabled"); expect(before.events).toHaveLength(0);
  });

  it("requires controlled shadow evidence for replay-to-shadow", () => {
    const replayStrategy = { ...crossSectionalMomentum, stage: "replay" as const };
    const store = createStrategyLifecycleStore(replayStrategy);
    const shadowEvidence = { strategyKey: replayStrategy.key, strategyVersion: replayStrategy.version, observations: [{ observationId: "obs-1", observedAt: "2026-01-12T00:00:00Z", reason: "target" as const, returnPercent: "1.25", symbol: "AAA" }] };
    const assessment = assessShadowPromotion(shadowEvidence, { maxLossPercent: "5", minimumClosedObservations: 1, minimumPositiveObservations: 1 });
    expect(assessment.automatedChecksPass).toBe(true);
    expect(() => store.transition({ actorId: "operator-1", approval: { approvedAt: "2026-01-12T00:00:00Z", approvedBy: "operator-1", note: "Reviewed shadow evidence." }, automatedChecksPass: true, reason: "Shadow review approved.", requestedAt: "2026-01-12T00:00:00Z", shadowEvidence, strategyKey: replayStrategy.key, strategyVersion: replayStrategy.version, toStage: "shadow" })).not.toThrow();
    expect(store.get().stage).toBe("shadow");
  });

  it("requires paper-forward evidence for shadow-to-paper", () => {
    const paperStrategy = { ...crossSectionalMomentum, stage: "shadow" as const };
    const store = createStrategyLifecycleStore(paperStrategy);
    const paperEvidence = { closedTrades: 20, consecutiveCalendarDays: 30, duplicateOrderCount: 0, maxDrawdownPercent: "4", positiveTrades: 12, riskViolationCount: 0, staleDataBreachCount: 0, strategyKey: paperStrategy.key, strategyVersion: paperStrategy.version };
    expect(() => store.transition({ actorId: "operator-1", approval: { approvedAt: "2026-02-12T00:00:00Z", approvedBy: "operator-1", note: "Reviewed paper-forward evidence." }, automatedChecksPass: true, paperEvidence, reason: "Paper readiness approved.", requestedAt: "2026-02-12T00:00:00Z", strategyKey: paperStrategy.key, strategyVersion: paperStrategy.version, toStage: "paper" })).not.toThrow();
    expect(store.get().stage).toBe("paper");
  });
});
