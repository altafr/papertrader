import { describe, expect, it } from "vitest";

import { isCompleteExitPlan } from "./exit-plan.js";

describe("exit plan completeness", () => {
  const base = { alpacaOrderId: "alpaca-1", entryPrice: "100", plannedStopPrice: "95", strategyKey: "momentum", strategyVersion: "1.0.0" };

  it("requires a target or time stop in addition to core provenance", () => {
    expect(isCompleteExitPlan(base)).toBe(false);
    expect(isCompleteExitPlan({ ...base, plannedTargetPrice: "104" })).toBe(true);
    expect(isCompleteExitPlan({ ...base, timeStopAt: "2026-08-30T00:00:00.000Z" })).toBe(true);
  });

  it("rejects missing broker identity and blank fields", () => {
    expect(isCompleteExitPlan({ ...base, alpacaOrderId: "", plannedTargetPrice: "104" })).toBe(false);
    expect(isCompleteExitPlan({ ...base, strategyKey: "  ", plannedTargetPrice: "104" })).toBe(false);
  });
});
