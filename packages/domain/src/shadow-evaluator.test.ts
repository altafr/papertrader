import { describe, expect, it } from "vitest";
import { evaluateShadowBar, runShadowEvaluation } from "./shadow-evaluator.js";
import { createShadowObservation } from "./shadow.js";
import { crossSectionalMomentum } from "./strategies.js";
import type { StrategyBar, StrategySignalCandidate } from "./strategy.js";

const candidate: StrategySignalCandidate = { assetClass: "us_equity", expiresAt: "2026-01-11T00:00:00Z", plannedExitPrice: "110", plannedStopPrice: "95", proposedEntryPrice: "100", rationale: "fixture", score: "1", signalTime: "2026-01-10T00:00:00Z", side: "long", strategyKey: crossSectionalMomentum.key, strategyVersion: crossSectionalMomentum.version, symbol: "AAA", timeStopAt: "2026-01-10T03:00:00Z" };
const observation = createShadowObservation({ candidate, createdAt: "2026-01-10T00:01:00Z", observationId: "shadow-1", strategy: { ...crossSectionalMomentum, stage: "shadow" } });
const bar = (timestamp: string, high: string, low: string, close = "100"): StrategyBar => ({ symbol: "AAA", timestamp, open: close, high, low, close, volume: "100" });

describe("finalized-bar shadow evaluator", () => {
  it("uses stop and target rules, with ambiguous bars invalidated", () => {
    expect(evaluateShadowBar(observation, bar("2026-01-10T01:00:00Z", "101", "94")).outcome?.reason).toBe("stop");
    expect(evaluateShadowBar(observation, bar("2026-01-10T01:00:00Z", "111", "99")).outcome?.reason).toBe("target");
    expect(evaluateShadowBar(observation, bar("2026-01-10T01:00:00Z", "111", "94")).outcome?.reason).toBe("invalidated");
  });

  it("applies time-stop and expiry only after trigger checks", () => {
    expect(evaluateShadowBar(observation, bar("2026-01-10T03:00:00Z", "101", "99", "100")).outcome?.reason).toBe("time_stop");
    const expired = { ...observation, timeStopAt: "2026-01-11T00:00:00Z", expiresAt: "2026-01-10T02:00:00Z" };
    expect(evaluateShadowBar(expired, bar("2026-01-10T02:00:00Z", "101", "99", "100")).outcome?.reason).toBe("expired");
  });

  it("never uses bars at or before the signal and stops after the first outcome", () => {
    const result = runShadowEvaluation(observation, [
      bar("2026-01-10T00:00:00Z", "120", "90"),
      bar("2026-01-10T01:00:00Z", "101", "99"),
      bar("2026-01-10T02:00:00Z", "111", "99"),
    ]);
    expect(result.evaluatedBars).toBe(2); expect(result.observation.outcome?.reason).toBe("target");
  });
});
