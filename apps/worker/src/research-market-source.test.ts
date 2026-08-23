import { describe, expect, it } from "vitest";
import type { PaperMarketDataReader } from "@momentum/alpaca";
import { createAlpacaResearchInputSource } from "./research-market-source.js";

const bar = { close: "110", high: "111", low: "109", open: "110", symbol: "AAA", timestamp: "2026-08-23T01:00:00.000Z", volume: "1000" };

describe("Alpaca research input source", () => {
  it("maps read-only paper bars into validated research input", async () => {
    let request: unknown;
    const reader: PaperMarketDataReader = { readHistoricalBars: async (value) => { request = value; return { bars: [bar] }; }, readSnapshots: async () => [] };
    const input = await createAlpacaResearchInputSource(reader).read({ assetClass: "us_equity", limit: 20, maxCandidates: 3, symbols: ["AAA"], timeframe: "1Day" });
    expect(input.source).toBe("alpaca");
    expect(input.bars[0]?.symbol).toBe("AAA");
    expect(request).toMatchObject({ assetClass: "us_equity", limit: 20, symbols: ["AAA"], timeframe: "1Day" });
  });

  it("fails closed on unbounded source requests", async () => {
    const reader: PaperMarketDataReader = { readHistoricalBars: async () => ({ bars: [] }), readSnapshots: async () => [] };
    const source = createAlpacaResearchInputSource(reader);
    await expect(source.read({ assetClass: "crypto", limit: 1_001, maxCandidates: 3, symbols: ["BTC/USD"], timeframe: "1Day" })).rejects.toThrow("limit");
    await expect(source.read({ assetClass: "crypto", limit: 20, maxCandidates: 3, symbols: Array.from({ length: 11 }, (_, i) => `A${i}`), timeframe: "1Day" })).rejects.toThrow("1 to 10");
  });
});
