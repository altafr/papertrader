import { describe, expect, it } from "vitest";

import { buildPaperPortfolioStatus } from "./paper-portfolio-status.js";

describe("paper portfolio status", () => {
  it("returns bounded reconciled portfolio facts", () => {
    expect(buildPaperPortfolioStatus({ capturedAt: new Date("2026-08-29T00:00:00.000Z"), cash: "1000.00", equity: "1010.50", positions: [{ assetClass: "crypto", marketValue: "10.50", quantity: "0.001", symbol: "BTC/USD", unrealizedPl: "0.50" }] })).toEqual({ capturedAt: "2026-08-29T00:00:00.000Z", cash: "1000.00", equity: "1010.50", positions: [{ assetClass: "crypto", marketValue: "10.50", quantity: "0.001", symbol: "BTC/USD", unrealizedPl: "0.50" }] });
  });

  it("filters malformed position values and timestamps", () => {
    expect(buildPaperPortfolioStatus({ capturedAt: "bad", cash: "secret", equity: "1", positions: [{ assetClass: "other", marketValue: "1", quantity: "1", symbol: "X", unrealizedPl: "0" }, { assetClass: "us_equity", marketValue: "1", quantity: "bad", symbol: "AAPL", unrealizedPl: "0" }] })).toEqual({ capturedAt: null, cash: null, equity: "1", positions: [] });
  });
});
