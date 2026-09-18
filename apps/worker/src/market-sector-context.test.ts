import { describe, expect, it } from "vitest";
import { classifyIntradayDirection, confirmMarketAndSector, filterByMarketAndSector } from "./market-sector-context.js";

const response = (closes: number[], opens = closes.map((close) => close - 1), timestamps = closes.map((_, index) => Date.parse(`2026-09-17T${String(13 + Math.floor(index * 5 / 60)).padStart(2, "0")}:${String((30 + index * 5) % 60).padStart(2, "0")}:00Z`) / 1_000)) => new Response(JSON.stringify({ chart: { result: [{ timestamp: timestamps, indicators: { quote: [{ open: opens, close: closes }] } }] } }), { status: 200 });
const candidate = { assetClass: "us_equity" as const, averageVolume: "100", dataAsOf: "2026-09-16T00:00:00Z", momentumReturn: "0.05", symbol: "AAPL" };

describe("market and sector web confirmation", () => {
  it("confirms aligned benchmark and sector trends", async () => {
    const fetcher = async () => response([100, 101, 102]);
    await expect(confirmMarketAndSector(candidate, fetcher)).resolves.toMatchObject({ confirmed: true, market: "bullish", sector: "bullish", sectorSymbol: "XLK" });
    await expect(filterByMarketAndSector([candidate], fetcher)).resolves.toHaveLength(1);
  });

  it("uses the opening 5–10 minute reference and latest session price", () => {
    const start = Date.parse("2026-09-17T13:30:00Z") / 1_000;
    expect(classifyIntradayDirection([{ timestamp: start, open: 100, close: 101 }, { timestamp: start + 300, open: 101, close: 102 }, { timestamp: start + 1_800, open: 102, close: 103 }])).toBe("bullish");
    expect(classifyIntradayDirection([{ timestamp: start, open: 100, close: 99 }, { timestamp: start + 300, open: 99, close: 98 }, { timestamp: start + 1_800, open: 98, close: 97 }])).toBe("bearish");
  });

  it("fails closed when the opening window or regular-session data is missing", () => {
    const start = Date.parse("2026-09-17T13:30:00Z") / 1_000;
    expect(classifyIntradayDirection([{ timestamp: start, open: 100, close: 101 }])).toBe("neutral");
    expect(classifyIntradayDirection([{ timestamp: Date.parse("2026-09-17T12:00:00Z") / 1_000, open: 100, close: 101 }])).toBe("neutral");
  });
});
