import { describe, expect, it } from "vitest";
import { formatDailyPortfolioSummary } from "./daily-summary.js";

describe("daily portfolio summary", () => {
  it("formats P/L and exposure from persisted positions", () => {
    expect(formatDailyPortfolioSummary({ buyingPower: "99000", cash: "98000", equity: "100000", lastEquity: "99500", orders: 3, positions: [{ marketValue: "1200", unrealizedPl: "25.50" }, { marketValue: "800", unrealizedPl: "-10.25" }] })).toContain("day P/L 500.00, unrealized P/L 15.25, gross exposure 2000.00, open positions 2, tracked orders 3");
  });

  it("reports unavailable metrics without inventing values", () => {
    expect(formatDailyPortfolioSummary({ buyingPower: "not reported", cash: "not reported", equity: "not reported", orders: 0, positions: [{ marketValue: "bad", unrealizedPl: "bad" }] })).toContain("day P/L not reported, unrealized P/L not reported, gross exposure not reported");
  });

  it("keeps decimal precision when aggregating very small values", () => {
    expect(formatDailyPortfolioSummary({ buyingPower: "0", cash: "0", equity: "1000.00000001", lastEquity: "1000", orders: 0, positions: [{ marketValue: "0.1", unrealizedPl: "0.1" }, { marketValue: "0.2", unrealizedPl: "0.2" }] })).toContain("day P/L 0.00, unrealized P/L 0.30, gross exposure 0.30");
  });
});
