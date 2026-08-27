import { describe, expect, it } from "vitest";
import { formatDailyPortfolioSummary } from "./daily-summary.js";

describe("daily portfolio summary", () => {
  it("formats P/L and exposure from persisted positions", () => {
    expect(formatDailyPortfolioSummary({ buyingPower: "99000", cash: "98000", equity: "100000", lastEquity: "99500", orders: 3, positions: [{ marketValue: "1200", unrealizedPl: "25.50" }, { marketValue: "800", unrealizedPl: "-10.25" }] })).toContain("day P/L 500.00, unrealized P/L 15.25, gross exposure 2000.00, open positions 2, tracked orders 3");
  });

  it("reports unavailable metrics without inventing values", () => {
    expect(formatDailyPortfolioSummary({ buyingPower: "not reported", cash: "not reported", equity: "not reported", orders: 0, positions: [{ marketValue: "bad", unrealizedPl: "bad" }] })).toContain("day P/L not reported, unrealized P/L not reported, gross exposure not reported");
  });
});
