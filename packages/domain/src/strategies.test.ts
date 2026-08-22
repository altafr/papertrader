import { describe, expect, it } from "vitest";
import { createStrategyRegistry } from "./strategy.js";
import { INITIAL_MOMENTUM_STRATEGIES, crossSectionalMomentum, intradayTrendContinuation, volumeConfirmedBreakout } from "./strategies.js";
import type { StrategyBar, StrategyEvaluationContext } from "./strategy.js";

const bar = (symbol: string, day: number, close: string, volume = "100", high = close): StrategyBar => ({ symbol, timestamp: `2026-01-${String(day).padStart(2, "0")}T14:30:00.000Z`, open: close, high, low: close, close, volume });
const context = (bars: readonly StrategyBar[]): StrategyEvaluationContext => ({ asOf: bars[bars.length - 1]?.timestamp ?? "2026-01-01T00:00:00.000Z", market: { bars, capturedAt: "2026-01-31T00:00:00.000Z", freshness: "fresh", source: "alpaca" }, positions: [] });

describe("initial momentum research plug-ins", () => {
  it("registers all candidates disabled", () => {
    const registry = createStrategyRegistry();
    for (const strategy of INITIAL_MOMENTUM_STRATEGIES) registry.register(strategy);
    expect(registry.list().map((strategy) => strategy.key)).toEqual(["cross-sectional-momentum", "volume-confirmed-breakout", "intraday-trend-continuation"]);
    expect(registry.list().every((strategy) => strategy.stage === "disabled")).toBe(true);
  });

  it("ranks cross-sectional returns and fails closed with insufficient history", () => {
    const bars = [...Array.from({ length: 3 }, (_, i) => bar("AAA", i + 1, String(100 + i * 10))), ...Array.from({ length: 3 }, (_, i) => bar("BBB", i + 1, String(100 - i)))];
    const parameters = crossSectionalMomentum.parameters.validate({ lookbackBars: 2, maxCandidates: 1, minReturn: "0.01" });
    const signals = crossSectionalMomentum.evaluate(context(bars), parameters);
    expect(signals).toHaveLength(1); expect(signals[0]?.symbol).toBe("AAA"); expect(signals[0]?.plannedStopPrice).toBe("117.60000000");
    expect(crossSectionalMomentum.evaluate(context(bars.slice(0, 2)), parameters)).toEqual([]);
  });

  it("requires both breakout and volume confirmation", () => {
    const bars = [...Array.from({ length: 3 }, (_, i) => bar("AAA", i + 1, "100", "100", "101")), bar("AAA", 4, "103", "150", "104")];
    const parameters = volumeConfirmedBreakout.parameters.validate({ rangeLookbackBars: 2, volumeLookbackBars: 2, volumeMultiplier: "2" });
    expect(volumeConfirmedBreakout.evaluate(context(bars), parameters)).toHaveLength(0);
    expect(volumeConfirmedBreakout.evaluate(context([...bars.slice(0, 3), bar("AAA", 4, "103", "300", "104")]), parameters)).toHaveLength(1);
  });

  it("emits aligned trend continuation and enforces bounds", () => {
    const bars = Array.from({ length: 6 }, (_, i) => bar("AAA", i + 1, String(100 + i * 2)));
    const parameters = intradayTrendContinuation.parameters.validate({ fastLookbackBars: 2, slowLookbackBars: 5, minTrendReturn: "0.02" });
    expect(intradayTrendContinuation.evaluate(context(bars), parameters)).toHaveLength(1);
    expect(() => intradayTrendContinuation.parameters.validate({ fastLookbackBars: 5, slowLookbackBars: 5 })).toThrow("less than");
    expect(intradayTrendContinuation.evaluate(context(bars.slice(0, 5)), parameters)).toEqual([]);
  });
});
