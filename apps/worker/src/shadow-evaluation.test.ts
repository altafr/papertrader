import { describe, expect, it } from "vitest";
import { assertShadowEvaluationOnce, getShadowEvaluationConfig } from "./shadow-evaluation.js";
import { createShadowEvaluationScheduler } from "./shadow-evaluation-service.js";

describe("shadow evaluation worker boundary", () => {
  it("is disabled by default and exposes bounded interval configuration", () => {
    expect(getShadowEvaluationConfig({})).toEqual({ enabled: false, intervalSeconds: 3600, sourceConfigured: false });
    expect(getShadowEvaluationConfig({ SHADOW_EVALUATION_INTERVAL_SECONDS: "60" })).toMatchObject({ intervalSeconds: 60 });
  });

  it("fails closed when enabled without a source or with unsafe intervals", () => {
    expect(() => getShadowEvaluationConfig({ SHADOW_EVALUATION_ENABLED: "true" })).toThrow("source");
    expect(() => getShadowEvaluationConfig({ SHADOW_EVALUATION_INTERVAL_SECONDS: "30" })).toThrow("60");
    expect(() => getShadowEvaluationConfig({ SHADOW_EVALUATION_INTERVAL_SECONDS: "86401" })).toThrow("86400");
  });

  it("requires an explicit one-shot opt-in", () => {
    expect(() => assertShadowEvaluationOnce({ SHADOW_EVALUATION_ENABLED: "true", SHADOW_EVALUATION_SOURCE_CONFIGURED: "true" })).toThrow("SHADOW_EVALUATION_ONCE");
    expect(assertShadowEvaluationOnce({ SHADOW_EVALUATION_ENABLED: "true", SHADOW_EVALUATION_SOURCE_CONFIGURED: "true", SHADOW_EVALUATION_ONCE: "true" })).toMatchObject({ enabled: true, sourceConfigured: true });
  });

  it("tracks bounded schedule and last-run health", async () => {
    let runs = 0;
    const scheduler = createShadowEvaluationScheduler({ intervalSeconds: 60, now: () => new Date("2026-01-10T00:00:00Z"), run: async () => { runs += 1; } });
    scheduler.start();
    await scheduler.runNow();
    expect(runs).toBe(1);
    scheduler.stop();
  });
});
