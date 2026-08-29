import { describe, expect, it } from "vitest";
import { buildExitPlanReviewReport } from "./exit-plan-review.js";

describe("exit plan review", () => {
  it("marks complete plans as managed and reports exact missing fields", () => {
    expect(buildExitPlanReviewReport(
      [{ assetClass: "crypto", symbol: "BTC/USD" }, { assetClass: "us_equity", symbol: "AAPL" }],
      [{ alpacaOrderId: "order-1", assetClass: "us_equity", entryPrice: "100", intentId: "intent-1", plannedStopPrice: "95", plannedTargetPrice: "110", strategyKey: "momentum", strategyVersion: "1.0.0", symbol: "AAPL" }],
    )).toEqual([
      { assetClass: "crypto", missingFields: ["alpacaOrderId", "entryPrice", "plannedStopPrice", "strategyKey", "strategyVersion", "plannedTargetPriceOrTimeStop"], status: "review_required", symbol: "BTC/USD" },
      { assetClass: "us_equity", missingFields: [], status: "managed", symbol: "AAPL" },
    ]);
  });
});
