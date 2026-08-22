import { describe, expect, it } from "vitest";

import { runHistoricalReplay } from "./replay.js";
import type { StrategyPlugin } from "./strategy.js";

const strategy: StrategyPlugin<Record<string, never>> = {
  assetClass: "us_equity",
  description: "Replay fixture.",
  evaluate: (context) => {
    if (context.market.bars.some((bar) => bar.timestamp > context.asOf)) throw new Error("Replay exposed future bars.");
    if (context.market.bars.length !== 1) {
      return [{
        assetClass: "us_equity",
        expiresAt: "2026-01-03T00:00:00Z",
        plannedStopPrice: "9.00",
        proposedEntryPrice: "10.00",
        rationale: "missing exit fixture",
        score: "1.0",
        signalTime: context.asOf,
        side: "long",
        strategyKey: "replay-fixture",
        strategyVersion: "1.0.0",
        symbol: "TEST",
      }];
    }
    return [
      {
        assetClass: "us_equity",
        expiresAt: "2026-01-03T00:00:00Z",
        plannedExitPrice: "12.00",
        plannedStopPrice: "9.00",
        proposedEntryPrice: "10.00",
        rationale: "fixture",
        recommendedNotional: "100",
        score: "1.0",
        signalTime: context.asOf,
        side: "long",
        strategyKey: "replay-fixture",
        strategyVersion: "1.0.0",
        symbol: "TEST",
      },
    ];
  },
  key: "replay-fixture",
  owner: "test",
  parameters: { defaults: {}, validate: (value) => value as Record<string, never> },
  requiredLookbackBars: 1,
  stage: "disabled",
  version: "1.0.0",
};

const bars = [
  { close: "10", high: "10", low: "9", open: "10", symbol: "TEST", timestamp: "2026-01-01T00:00:00Z", volume: "10" },
  { close: "11", high: "11", low: "10", open: "10", symbol: "TEST", timestamp: "2026-01-02T00:00:00Z", volume: "10" },
];

describe("historical replay", () => {
  it("keeps strategy context point-in-time and applies fees/slippage", () => {
    const result = runHistoricalReplay({
      bars,
      estimatedFeesPerTrade: "1.00",
      initialEquity: "1000.00",
      parameters: {},
      slippageBps: "10",
      strategy,
    });
    expect(result.evaluatedBars).toBe(2);
    expect(result.skippedSignals).toBe(1);
    expect(result.trades).toEqual([
      {
        entryPrice: "10",
        exitPrice: "12.00",
        fees: "1.00000000",
        grossPnl: "20.00000000",
        netPnl: "18.80000000",
        signalTime: "2026-01-01T00:00:00Z",
        slippage: "0.20000000",
        symbol: "TEST",
      },
    ]);
    expect(result.metrics.totalPnl).toBe("18.80000000");
  });

  it("rejects strategies that have already advanced beyond replay", () => {
    expect(() => runHistoricalReplay({ ...baseReplay(), strategy: { ...strategy, stage: "paper" } })).toThrow(
      "Only disabled or replay-stage strategies",
    );
  });
});

function baseReplay() {
  return {
    bars,
    estimatedFeesPerTrade: "0",
    initialEquity: "1000",
    parameters: {},
    slippageBps: "0",
    strategy,
  } as const;
}
