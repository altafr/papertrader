import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { Decimal } from "decimal.js";
import type { PaperMarketBar, PaperMarketDataReader } from "@momentum/alpaca";
import { buildMarketResearch, calculateTechnicalLevels, createTelegramMarketReader, finalizedResearchBars, getMarketResearchSymbols, isMarketToolQuestion, renderResearchChart } from "./telegram-market-research.js";

const bars: PaperMarketBar[] = Array.from({ length: 60 }, (_, index) => ({ symbol: "AAPL", timestamp: new Date(Date.UTC(2026, 6, index + 1, 4)).toISOString(), open: String(100 + index), high: String(102 + index), low: String(99 + index), close: String(101 + index), volume: "100000" }));
const now = new Date("2026-10-17T14:00:00Z");
const reader: PaperMarketDataReader = { readSnapshots: async () => [{ symbol: "AAPL", latestTrade: { price: "162", timestamp: "2026-10-16T19:59:00Z" }, previousDailyBar: { ...bars[0]!, close: "160" }, latestQuote: { bidPrice: "161.99", askPrice: "162.01", timestamp: "2026-10-16T19:59:00Z" } }], readHistoricalBars: async () => ({ bars }) };

describe("Telegram market research tools", () => {
  it.each([["/quote aapl", ["AAPL"]], ["/chart BRK.B", ["BRK.B"]], ["how is the S&P 500 doing?", ["SPY"]], ["what is Nvidia's support?", ["NVDA"]], ["how is aapl doing?", ["AAPL"]], ["aapl price", ["AAPL"]], ["Compare AAPL MSFT NVDA TSLA", ["AAPL", "MSFT", "NVDA"]], ["/market", []]])("resolves bounded ticker requests: %s", (question, symbols) => {
    expect(getMarketResearchSymbols(question as string)).toEqual(symbols);
  });
  it("keeps operational and execution requests out of the market route", () => {
    expect(isMarketToolQuestion("show AAPL orders and positions")).toBe(false);
    expect(isMarketToolQuestion("show AAPL support and resistance")).toBe(true);
    expect(isMarketToolQuestion("what is inflation doing?")).toBe(false);
  });
  it("calculates daily averages, Wilder RSI and correctly sided estimated levels", () => {
    const levels = calculateTechnicalLevels(bars, "162");
    expect(levels.sma20).toBe("150.50000000");
    expect(levels.sma50).toBe("135.50000000");
    expect(levels.rsi14).toBe("100.00000000");
    expect(levels.supports.length).toBeGreaterThan(0);
    expect(levels.supports.every((value) => new Decimal(value).lt(162))).toBe(true);
    expect(levels.resistances.every((value) => new Decimal(value).gt(162))).toBe(true);
    expect(calculateTechnicalLevels([], "100")).toMatchObject({ supports: [], resistances: [] });
    const flat = bars.map((bar) => ({ ...bar, close: "100" }));
    expect(calculateTechnicalLevels(flat, "100").rsi14).toBe("50.00000000");
  });
  it("excludes the current incomplete daily candle and malformed bars", () => {
    const today = { ...bars[0]!, timestamp: "2026-10-16T04:00:00Z" };
    expect(finalizedResearchBars([today], new Date("2026-10-16T18:00:00Z"))).toHaveLength(0);
    expect(finalizedResearchBars([today], new Date("2026-10-16T21:00:00Z"))).toHaveLength(1);
    expect(() => finalizedResearchBars([{ ...today, high: "1" }], now)).toThrow("Malformed");
  });
  it("labels closed-session quotes with timestamps and returns a real PNG chart", async () => {
    const result = await buildMarketResearch("/chart AAPL", reader, { now, feed: "iex" });
    expect(result.reply.text).toContain("AAPL $162.00 (1.25%");
    expect(result.reply.text).toContain("historical last-reported");
    expect(result.reply.text).toContain("single-exchange coverage");
    expect(result.reply.text).toContain("HKT");
    expect(result.reply.text).toContain("does not add it to the trading universe");
    const metadata = await sharp(result.reply.chart).metadata();
    expect(metadata).toMatchObject({ format: "png", width: 850, height: 630 });
    expect(result.evidence.dataStatus).toBe("complete");
  });
  it("still returns a quote when historical data fails", async () => {
    const result = await buildMarketResearch("/quote AAPL", { ...reader, readHistoricalBars: async () => { throw new Error("unavailable"); } }, { now });
    expect(result.reply.text).toContain("AAPL $162.00");
    expect(result.reply.text).toContain("historical bars unavailable");
    expect(result.reply.text).toContain("Estimated support: not established");
  });
  it("returns no invented quote for an unknown symbol and asks for an omitted ticker", async () => {
    const result = await buildMarketResearch("/quote XXXXX", reader, { now });
    expect(result.reply.text).toContain("XXXXX: quote unavailable");
    expect(result.evidence.dataStatus).toBe("unavailable");
    expect((await buildMarketResearch("/chart", reader)).reply.text).toContain("Please include a US ticker");
  });
  it("uses explicit feeds, split-adjusted bars and only read endpoints", async () => {
    const calls: string[] = [];
    const fetcher = vi.fn<typeof fetch>(async (url, init) => { expect(init?.method).toBe("GET"); calls.push(String(url)); return new Response(JSON.stringify(String(url).includes("snapshots") ? { AAPL: {} } : { bars: {} }), { status: 200 }); });
    const source = createTelegramMarketReader({ ALPACA_API_KEY: "key", ALPACA_SECRET_KEY: "secret" }, fetcher);
    await source.reader.readSnapshots({ assetClass: "us_equity", symbols: ["AAPL"] });
    await source.reader.readHistoricalBars({ assetClass: "us_equity", symbols: ["AAPL"], limit: 100, timeframe: "1Day" });
    expect(calls.every((url) => url.startsWith("https://data.alpaca.markets/") && url.includes("feed=iex"))).toBe(true);
    expect(calls[1]).toContain("adjustment=split");
  });
  it("requires enough history before rendering a chart", async () => {
    await expect(renderResearchChart("AAPL", [], calculateTechnicalLevels([], "100"), "iex")).rejects.toThrow("Insufficient");
  });
  it("compares the eleven sector ETF proxies and ranks only available evidence", async () => {
    const readSnapshots = vi.fn<PaperMarketDataReader["readSnapshots"]>(async () => [
      { symbol: "XLK", latestTrade: { price: "102", timestamp: "2026-10-16T19:59:00Z" }, previousDailyBar: { ...bars[0]!, close: "100" } },
      { symbol: "XLF", latestTrade: { price: "104", timestamp: "2026-10-16T19:59:00Z" }, previousDailyBar: { ...bars[0]!, close: "100" } },
    ]);
    const result = await buildMarketResearch("Which sectors are strongest?", { ...reader, readSnapshots }, { now });
    expect(readSnapshots.mock.calls[0]?.[0].symbols).toHaveLength(11);
    expect(result.reply.text.indexOf("XLF Financials: 4.00%")).toBeLessThan(result.reply.text.indexOf("XLK Technology: 2.00%"));
    expect(result.reply.text).toContain("2/11 sector ETFs available");
    expect(result.evidence.dataStatus).toBe("partial");
  });
});
