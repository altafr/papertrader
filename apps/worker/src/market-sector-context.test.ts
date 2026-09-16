import { describe, expect, it } from "vitest";
import { confirmMarketAndSector, filterByMarketAndSector } from "./market-sector-context.js";

const response = (closes: number[]) => new Response(JSON.stringify({ chart: { result: [{ indicators: { quote: [{ close: closes }] } }] } }), { status: 200 });
const candidate = { assetClass: "us_equity" as const, averageVolume: "100", dataAsOf: "2026-09-16T00:00:00Z", momentumReturn: "0.05", symbol: "AAPL" };

describe("market and sector web confirmation", () => {
  it("confirms aligned benchmark and sector trends", async () => {
    const fetcher = async () => response(Array.from({ length: 60 }, (_, index) => 100 + index));
    await expect(confirmMarketAndSector(candidate, fetcher)).resolves.toMatchObject({ confirmed: true, market: "bullish", sector: "bullish", sectorSymbol: "XLK" });
    await expect(filterByMarketAndSector([candidate], fetcher)).resolves.toHaveLength(1);
  });
});
