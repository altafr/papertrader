import { describe, expect, it } from "vitest";
import type { PaperMarketDataReader } from "@momentum/alpaca";
import { createAlpacaResearchInputSource, validateResearchBars } from "./research-market-source.js";

const bar = { close: "110", high: "111", low: "109", open: "110", symbol: "AAA", timestamp: "2026-08-23T01:00:00.000Z", volume: "1000" };

describe("Alpaca research input source", () => {
  it("maps read-only paper bars into validated research input", async () => {
    let request: unknown;
    const reader: PaperMarketDataReader = { readHistoricalBars: async (value) => { request = value; return { bars: [bar, { ...bar, close: "111", high: "112", open: "110", timestamp: "2026-08-23T01:30:00.000Z" }] }; }, readSnapshots: async () => [] };
    const input = await createAlpacaResearchInputSource(reader, () => new Date("2026-08-23T02:00:00.000Z")).read({ assetClass: "us_equity", limit: 20, maxCandidates: 3, symbols: ["AAA"], timeframe: "1Day" });
    expect(input.source).toBe("alpaca");
    expect(input.bars[0]?.symbol).toBe("AAA");
    expect(request).toMatchObject({ assetClass: "us_equity", limit: 20, symbols: ["AAA"], timeframe: "1Day" });
  });

  it("fails closed on unbounded source requests", async () => {
    const reader: PaperMarketDataReader = { readHistoricalBars: async () => ({ bars: [bar, { ...bar, timestamp: "2026-08-23T01:30:00.000Z" }] }), readSnapshots: async () => [] };
    const source = createAlpacaResearchInputSource(reader);
    await expect(source.read({ assetClass: "crypto", limit: 1_001, maxCandidates: 3, symbols: ["BTC/USD"], timeframe: "1Day" })).rejects.toThrow("limit");
    await expect(source.read({ assetClass: "crypto", limit: 20, maxCandidates: 3, symbols: Array.from({ length: 11 }, (_, i) => `A${i}`), timeframe: "1Day" })).rejects.toThrow("1 to 10");
  });

  it("rejects future, unrequested, out-of-order, and inconsistent bars", () => {
    const now = new Date("2026-08-23T02:00:00.000Z");
    expect(() => validateResearchBars({ bars: [{ ...bar, timestamp: "2026-08-23T03:00:00.000Z" }, { ...bar, timestamp: "2026-08-23T03:30:00.000Z" }], now, symbols: ["AAA"] })).toThrow("future");
    expect(() => validateResearchBars({ bars: [{ ...bar, symbol: "BBB" }, { ...bar, symbol: "BBB", timestamp: "2026-08-23T01:30:00.000Z" }], now, symbols: ["AAA"] })).toThrow("unrequested");
    expect(() => validateResearchBars({ bars: [bar, { ...bar, timestamp: "2026-08-23T00:30:00.000Z" }], now, symbols: ["AAA"] })).toThrow("out-of-order");
    expect(() => validateResearchBars({ bars: [{ ...bar, high: "90" }, { ...bar, timestamp: "2026-08-23T01:30:00.000Z" }], now, symbols: ["AAA"] })).toThrow("inconsistent");
    expect(() => validateResearchBars({ bars: [bar, { ...bar }], now, symbols: ["AAA"] })).toThrow("duplicate");
  });

  it("accepts large decimal market values without binary-number overflow", () => {
    const large = "999999999999999999999999999999";
    const high = "1000000000000000000000000000000";
    const low = "999999999999999999999999999998";
    expect(() => validateResearchBars({ bars: [{ ...bar, open: large, high, low, close: large, volume: large }, { ...bar, open: large, high, low, close: large, volume: large, timestamp: "2026-08-23T01:30:00.000Z" }], now: new Date("2026-08-23T02:00:00.000Z"), symbols: ["AAA"] })).not.toThrow();
  });
});
