import { describe, expect, it } from "vitest";
import { countUnmanagedPositions, formatDailyPortfolioSummary } from "./daily-summary.js";

describe("daily portfolio summary", () => {
  it("counts positions without a matching exit plan", () => {
    expect(countUnmanagedPositions([{ assetClass: "crypto", symbol: "BTC/USD" }, { assetClass: "us_equity", symbol: "AAPL" }], [{ assetClass: "us_equity", symbol: "AAPL" }])).toBe(1);
  });

  it("matches compact and slash-form broker symbols", () => {
    expect(countUnmanagedPositions([{ assetClass: "crypto", symbol: "BTCUSD" }], [{ assetClass: "crypto", symbol: "BTC/USD" }])).toBe(0);
  });

  it("formats P/L and exposure from persisted positions", () => {
    expect(formatDailyPortfolioSummary({ buyingPower: "99000", cash: "98000", equity: "100000", lastEquity: "99500", orders: 3, unmanagedPositions: 1, positions: [{ marketValue: "1200", symbol: "AAPL", unrealizedPl: "25.50" }, { marketValue: "800", symbol: "BTC/USD", unrealizedPl: "-10.25" }] })).toContain("equity 100000.00, cash 98000.00, buying power 99000.00, day P/L 500.00, unrealized P/L 15.25, gross exposure 2000.00, open positions 2, position P/L [AAPL 25.50, BTC/USD -10.25], tracked orders 3, unmanaged positions 1.");
  });

  it("reports unavailable metrics without inventing values", () => {
    expect(formatDailyPortfolioSummary({ buyingPower: "not reported", cash: "not reported", equity: "not reported", orders: 0, positions: [{ marketValue: "bad", unrealizedPl: "bad" }] })).toContain("day P/L not reported, unrealized P/L not reported, gross exposure not reported");
  });

  it("keeps decimal precision when aggregating very small values", () => {
    expect(formatDailyPortfolioSummary({ buyingPower: "0", cash: "0", equity: "1000.00000001", lastEquity: "1000", orders: 0, positions: [{ marketValue: "0.1", unrealizedPl: "0.1" }, { marketValue: "0.2", unrealizedPl: "0.2" }] })).toContain("day P/L 0.00, unrealized P/L 0.30, gross exposure 0.30");
  });
});
