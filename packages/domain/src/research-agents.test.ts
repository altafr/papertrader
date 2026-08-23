import { describe, expect, it } from "vitest";
import { runCryptoResearch, runStockResearch, type ResearchWatchlistPayload } from "./research-agents.js";
import type { StrategyBar } from "./strategy.js";

const bars = (symbol: string): readonly StrategyBar[] => [
  { close: "100", high: "101", low: "99", open: "100", symbol, timestamp: "2026-08-23T00:00:00.000Z", volume: "1000" },
  { close: "110", high: "111", low: "109", open: "110", symbol, timestamp: "2026-08-23T01:00:00.000Z", volume: "2000" },
];

const input = { bars: [...bars("AAA"), ...bars("BBB").map((bar) => ({ ...bar, close: "105" }))], capturedAt: "2026-08-23T01:00:00.000Z", freshness: "fresh" as const, maxCandidates: 1, source: "alpaca" as const };

describe("read-only research agents", () => {
  it("returns a bounded, deterministic stock watchlist artifact", () => {
    const artifact = runStockResearch(input);
    const payload = artifact.payload as unknown as ResearchWatchlistPayload;
    expect(artifact.artifactType).toBe("research_watchlist");
    expect(payload.assetClass).toBe("us_equity");
    expect(payload.candidates).toHaveLength(1);
    expect(payload.candidates[0]?.symbol).toBe("AAA");
    expect(payload.candidates[0]?.momentumReturn).toBe("0.10000000");
    expect(artifact.rationale).toContain("not an order recommendation");
  });

  it("keeps crypto research separate and rejects stale or wrong-source input", () => {
    const artifact = runCryptoResearch(input);
    const payload = artifact.payload as unknown as ResearchWatchlistPayload;
    expect(payload.assetClass).toBe("crypto");
    expect(() => runStockResearch({ ...input, freshness: "fresh", source: "other" as "alpaca" })).toThrow("fresh Alpaca");
  });

  it("fails closed on invalid bars and unbounded candidate limits", () => {
    expect(() => runStockResearch({ ...input, maxCandidates: 21 })).toThrow("maxCandidates");
    expect(() => runStockResearch({ ...input, bars: [{ ...input.bars[0]!, close: "0" }, input.bars[1]!] })).toThrow("close");
  });
});
