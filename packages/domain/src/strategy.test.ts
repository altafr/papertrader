import { describe, expect, it } from "vitest";

import {
  advanceStrategyStage,
  canAdvanceStrategyStage,
  createStrategyRegistry,
  type StrategyPlugin,
} from "./strategy.js";

const strategy: StrategyPlugin<{ lookback: number }> = {
  assetClass: "us_equity",
  description: "Disabled contract fixture.",
  evaluate: () => [],
  key: "fixture-momentum",
  owner: "research",
  parameters: {
    defaults: { lookback: 20 },
    validate: (value) => {
      if (typeof value !== "object" || value === null || !("lookback" in value)) throw new Error("invalid parameters");
      const lookback = value.lookback;
      if (typeof lookback !== "number" || !Number.isInteger(lookback) || lookback < 2 || lookback > 200) {
        throw new Error("lookback out of bounds");
      }
      return { lookback };
    },
  },
  requiredLookbackBars: 20,
  stage: "disabled",
  version: "1.0.0",
};

describe("strategy contract", () => {
  it("requires sequential lifecycle advancement", () => {
    expect(canAdvanceStrategyStage("disabled", "replay")).toBe(true);
    expect(canAdvanceStrategyStage("disabled", "paper")).toBe(false);
    expect(advanceStrategyStage("replay", "shadow")).toBe("shadow");
    expect(() => advanceStrategyStage("disabled", "paper")).toThrow("Invalid strategy stage transition");
  });

  it("registers only disabled, versioned strategies and rejects duplicates", () => {
    const registry = createStrategyRegistry();
    registry.register(strategy);
    expect(registry.get("fixture-momentum", "1.0.0")?.stage).toBe("disabled");
    expect(() => registry.register(strategy)).toThrow("already registered");
    expect(strategy.parameters.validate({ lookback: 20 })).toEqual({ lookback: 20 });
    expect(() => strategy.parameters.validate({ lookback: 1 })).toThrow("out of bounds");
  });

  it("rejects non-semver and enabled registrations", () => {
    const registry = createStrategyRegistry();
    expect(() => registry.register({ ...strategy, version: "v1" })).toThrow("semantic version");
    expect(() => registry.register({ ...strategy, stage: "replay" })).toThrow("registered disabled");
  });
});
