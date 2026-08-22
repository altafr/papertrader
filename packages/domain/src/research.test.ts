import { describe, expect, it } from "vitest";
import { assessReplayPromotion, runRegimeReplay, type RegimeReplayInput } from "./research.js";
import { crossSectionalMomentum, intradayTrendContinuation, volumeConfirmedBreakout } from "./strategies.js";
import type { StrategyBar } from "./strategy.js";

const bar = (symbol: string, index: number, close: string, volume = "100"): StrategyBar => ({
  symbol, timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString(), open: close, high: close, low: close, close, volume,
});

function regimeBars(regime: "bull" | "bear" | "choppy"): readonly StrategyBar[] {
  const values = regime === "bull" ? ["100", "102", "104", "106", "108", "110", "112", "114"]
    : regime === "bear" ? ["114", "112", "110", "108", "106", "104", "102", "100"]
      : ["100", "103", "99", "104", "101", "105", "102", "106"];
  return values.flatMap((value, index) => [bar("AAA", index, value, index === values.length - 1 ? "300" : "100"), bar("BBB", index, "100")]);
}

const regimes: readonly RegimeReplayInput[] = [
  { name: "bull-2026-01", regime: "bull", bars: regimeBars("bull") },
  { name: "bear-2026-01", regime: "bear", bars: regimeBars("bear") },
  { name: "choppy-2026-01", regime: "choppy", bars: regimeBars("choppy") },
];

describe("research replay evidence", () => {
  it("runs all three disabled candidates across named regimes with explicit research sizing", () => {
    const cases = [
      [crossSectionalMomentum, { lookbackBars: 2, maxCandidates: 1, minReturn: "0.01" }],
      [volumeConfirmedBreakout, { rangeLookbackBars: 2, volumeLookbackBars: 2, volumeMultiplier: "1.5" }],
      [intradayTrendContinuation, { fastLookbackBars: 2, slowLookbackBars: 5, minTrendReturn: "0.01" }],
    ] as const;
    for (const [strategy, parameters] of cases) {
      const evidence = runRegimeReplay({ defaultNotional: "100", estimatedFeesPerTrade: "0", initialEquity: "1000", parameters: strategy.parameters.validate(parameters), regimes, slippageBps: "0", strategy });
      expect(evidence.strategyKey).toBe(strategy.key);
      expect(evidence.results).toHaveLength(3);
      expect(evidence.results.every((result) => result.replay.evaluatedBars === regimes[0]!.bars.length)).toBe(true);
    }
  });

  it("never auto-promotes and reports insufficient evidence explicitly", () => {
    const evidence = runRegimeReplay({ defaultNotional: "100", estimatedFeesPerTrade: "0", initialEquity: "1000", parameters: crossSectionalMomentum.parameters.validate({ lookbackBars: 2 }), regimes: regimes.slice(0, 1), slippageBps: "0", strategy: crossSectionalMomentum });
    const assessment = assessReplayPromotion(evidence, { maxDrawdownPercent: "5", minimumPositiveRegimes: 2, minimumTrades: 100 });
    expect(assessment.promotable).toBe(false);
    expect(assessment.reasons.some((reason) => reason.includes("minimum trade sample"))).toBe(true);
    expect(assessment.reasons.some((reason) => reason.includes("manual review"))).toBe(true);
  });
});
