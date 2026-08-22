import { describe, expect, it } from "vitest";
import { runShadowEvaluationBatch } from "./shadow-runner.js";
import { createShadowObservation } from "./shadow.js";
import { crossSectionalMomentum } from "./strategies.js";
import type { StrategyBar } from "./strategy.js";

const candidate = { assetClass: "us_equity" as const, expiresAt: "2026-01-11T00:00:00Z", plannedExitPrice: "110", plannedStopPrice: "95", proposedEntryPrice: "100", rationale: "fixture", score: "1", signalTime: "2026-01-10T00:00:00Z", side: "long" as const, strategyKey: crossSectionalMomentum.key, strategyVersion: crossSectionalMomentum.version, symbol: "AAA" };
const makeObservation = (id: string) => createShadowObservation({ candidate: { ...candidate, symbol: "AAA" }, createdAt: "2026-01-10T00:01:00Z", observationId: id, strategy: { ...crossSectionalMomentum, stage: "shadow" } });
const targetBar: StrategyBar = { symbol: "AAA", timestamp: "2026-01-10T01:00:00Z", open: "100", high: "111", low: "99", close: "110", volume: "100" };

describe("durable shadow evaluation runner", () => {
  it("closes new observations, leaves open ones, and skips already-closed records on retry", async () => {
    const observations = [makeObservation("shadow-b"), makeObservation("shadow-a")];
    const closed = new Set<string>(["shadow-closed"]);
    const persisted: string[] = [];
    const input = {
      observations: [...observations, makeObservation("shadow-closed")],
      barSource: { getFinalizedBars: async (observation: typeof observations[number]) => observation.observationId === "shadow-a" ? [targetBar] : [] },
      persistence: { isClosed: async (id: string) => closed.has(id), recordOutcome: async (id: string) => { closed.add(id); persisted.push(id); } },
    };
    const first = await runShadowEvaluationBatch(input);
    expect(first).toMatchObject({ alreadyClosed: 1, closed: 1, opened: 1, processed: 3 }); expect(persisted).toEqual(["shadow-a"]);
    const second = await runShadowEvaluationBatch(input);
    expect(second).toMatchObject({ alreadyClosed: 2, closed: 0, opened: 1, processed: 3 }); expect(persisted).toEqual(["shadow-a"]);
  });

  it("reports source and persistence failures without exposing provider errors", async () => {
    const observation = makeObservation("shadow-failure");
    const sourceFailure = await runShadowEvaluationBatch({ observations: [observation], barSource: { getFinalizedBars: async () => { throw new Error("secret provider detail"); } }, persistence: { isClosed: async () => false, recordOutcome: async () => undefined } });
    expect(sourceFailure.failures).toEqual([{ code: "bar_source_failed", observationId: "shadow-failure" }]);
    const persistenceFailure = await runShadowEvaluationBatch({ observations: [observation], barSource: { getFinalizedBars: async () => [targetBar] }, persistence: { isClosed: async () => false, recordOutcome: async () => { throw new Error("database detail"); } } });
    expect(persistenceFailure.failures).toEqual([{ code: "outcome_persistence_failed", observationId: "shadow-failure" }]);
  });
});
