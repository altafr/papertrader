import { describe, expect, it } from "vitest";
import { closeShadowObservation, createShadowObservation, createShadowObservationStore } from "./shadow.js";
import { crossSectionalMomentum } from "./strategies.js";
import type { StrategySignalCandidate } from "./strategy.js";

const candidate: StrategySignalCandidate = {
  assetClass: "us_equity", expiresAt: "2026-01-11T00:00:00Z", plannedExitPrice: "110.00", plannedStopPrice: "95.00", proposedEntryPrice: "100.00", rationale: "fixture", score: "0.50", signalTime: "2026-01-10T00:00:00Z", side: "long", strategyKey: crossSectionalMomentum.key, strategyVersion: crossSectionalMomentum.version, symbol: "AAA", timeStopAt: "2026-01-11T00:00:00Z",
};

describe("shadow observations", () => {
  it("creates only for shadow-stage strategies and closes once with decimal return", () => {
    const observation = createShadowObservation({ candidate, createdAt: "2026-01-10T00:01:00Z", observationId: "shadow-1", strategy: { ...crossSectionalMomentum, stage: "shadow" } });
    const closed = closeShadowObservation(observation, { exitPrice: "105.00", observedAt: "2026-01-10T01:00:00Z", reason: "time_stop" });
    expect(closed.status).toBe("closed"); expect(closed.outcome?.returnPercent).toBe("5.00000000");
    expect(() => closeShadowObservation(closed, { exitPrice: "106", observedAt: "2026-01-10T02:00:00Z", reason: "target" })).toThrow("already closed");
  });

  it("rejects disabled strategies, invalid timing, and duplicate IDs", () => {
    expect(() => createShadowObservation({ candidate, createdAt: "2026-01-10T00:01:00Z", observationId: "shadow-1", strategy: crossSectionalMomentum })).toThrow("shadow-stage");
    expect(() => createShadowObservation({ candidate, createdAt: "2026-01-09T00:00:00Z", observationId: "shadow-1", strategy: { ...crossSectionalMomentum, stage: "shadow" } })).toThrow("precede");
    const store = createShadowObservationStore();
    const observation = createShadowObservation({ candidate, createdAt: "2026-01-10T00:01:00Z", observationId: "shadow-1", strategy: { ...crossSectionalMomentum, stage: "shadow" } });
    store.append(observation); expect(() => store.append(observation)).toThrow("already exists");
    expect(() => store.close("missing", { exitPrice: "100", observedAt: "2026-01-10T01:00:00Z", reason: "expired" })).toThrow("not found");
  });
});
