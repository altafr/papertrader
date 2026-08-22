import { describe, expect, it } from "vitest";
import { assessShadowPromotion } from "./shadow-promotion.js";

describe("shadow promotion evidence", () => {
  it("reports deterministic sample, positive count, and worst loss", () => {
    const assessment = assessShadowPromotion({ strategyKey: "s", strategyVersion: "1", observations: [
      { observationId: "1", observedAt: "2026-01-01T00:00:00Z", reason: "target", returnPercent: "2.5", symbol: "AAA" },
      { observationId: "2", observedAt: "2026-01-01T00:00:00Z", reason: "stop", returnPercent: "-3.25", symbol: "BBB" },
    ] }, { maxLossPercent: "5", minimumClosedObservations: 2, minimumPositiveObservations: 1 });
    expect(assessment).toMatchObject({ automatedChecksPass: true, promotable: false, positiveObservations: 1, sampleSize: 2, worstLossPercent: "3.25" });
  });

  it("fails automated checks when the loss or sample threshold is breached", () => {
    const assessment = assessShadowPromotion({ strategyKey: "s", strategyVersion: "1", observations: [{ observationId: "1", observedAt: "2026-01-01T00:00:00Z", reason: "stop", returnPercent: "-6", symbol: "AAA" }] }, { maxLossPercent: "5", minimumClosedObservations: 2, minimumPositiveObservations: 1 });
    expect(assessment.automatedChecksPass).toBe(false);
    expect(assessment.reasons).toHaveLength(4);
  });
});
