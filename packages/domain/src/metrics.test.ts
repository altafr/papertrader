import { describe, expect, it } from "vitest";

import { calculateExposure, calculatePerformanceMetrics, calculateTradeRisk, MAX_SINGLE_TRADE_RISK_USD } from "./metrics.js";

describe("decimal-safe metrics", () => {
  it("calculates P/L and drawdown without binary floating-point drift", () => {
    expect(
      calculatePerformanceMetrics([
        { capturedAt: "2026-01-01T00:00:00Z", equity: "1000.00" },
        { capturedAt: "2026-01-02T00:00:00Z", equity: "990.10" },
        { capturedAt: "2026-01-03T00:00:00Z", equity: "1010.20" },
      ]),
    ).toEqual({
      finalEquity: "1010.20000000",
      initialEquity: "1000.00000000",
      maxDrawdownAmount: "9.90000000",
      maxDrawdownPercent: "0.99000000",
      totalPnl: "10.20000000",
      totalReturnPercent: "1.02000000",
    });
  });

  it("calculates gross exposure from absolute position values", () => {
    expect(calculateExposure([{ marketValue: "10.10" }, { marketValue: "-2.05" }], "1000")).toEqual({
      grossExposure: "12.15000000",
      grossExposurePercent: "1.21500000",
    });
  });

  it("enforces the lower of 0.25% equity and USD 100 per-trade risk", () => {
    const result = calculateTradeRisk({
      entryPrice: "10.00",
      equity: "1000",
      estimatedFees: "0.10",
      estimatedSlippage: "0.10",
      quantity: "0.2",
      stopPrice: "0.00",
    });
    expect(result.allowedRisk).toBe("2.50000000");
    expect(result.estimatedLoss).toBe("2.20000000");
    expect(result.passes).toBe(true);
    expect(calculateTradeRisk({ ...resultInput(), quantity: "1" }).passes).toBe(false);
  });

  it("never raises the absolute single-trade ceiling above USD 100", () => {
    const result = calculateTradeRisk({ ...resultInput(), equity: "100000", quantity: "10" });
    expect(MAX_SINGLE_TRADE_RISK_USD).toBe("100");
    expect(result.maximumRiskAbsolute).toBe("100.00000000");
    expect(result.allowedRisk).toBe("100.00000000");
    expect(result.estimatedLoss).toBe("100.20000000");
    expect(result.passes).toBe(false);
  });

  it("rejects invalid negative financial inputs", () => {
    expect(() => calculateExposure([{ marketValue: "-1" }], "-100")).toThrow("equity must not be negative");
    expect(() => calculateTradeRisk({ ...resultInput(), estimatedFees: "-0.01" })).toThrow("estimated fees must not be negative");
  });
});

function resultInput() {
  return {
    entryPrice: "10.00",
    equity: "1000",
    estimatedFees: "0.10",
    estimatedSlippage: "0.10",
    quantity: "0.2",
    stopPrice: "0.00",
  } as const;
}
