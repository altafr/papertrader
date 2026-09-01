import { describe, expect, it } from "vitest";
import { buildExitPlanReviewReport, EXIT_PLAN_BACKFILL_INPUTS } from "./exit-plan-review.js";

describe("exit plan review", () => {
  it("publishes non-secret backfill input guidance", () => {
    expect(EXIT_PLAN_BACKFILL_INPUTS).toMatchObject({ entryPrice: "EXIT_PLAN_ENTRY_PRICE", plannedTargetPriceOrTimeStop: "EXIT_PLAN_TARGET_PRICE or EXIT_PLAN_TIME_STOP_AT" });
  });

  it("marks complete plans as managed and reports exact missing fields", () => {
    expect(buildExitPlanReviewReport(
      [{ assetClass: "crypto", symbol: "BTC/USD" }, { assetClass: "us_equity", symbol: "AAPL" }],
      [{ alpacaOrderId: "order-1", assetClass: "us_equity", entryPrice: "100", intentId: "intent-1", plannedStopPrice: "95", plannedTargetPrice: "110", strategyKey: "momentum", strategyVersion: "1.0.0", symbol: "AAPL" }],
    )).toEqual([
      { assetClass: "crypto", missingFields: ["alpacaOrderId", "entryPrice", "plannedStopPrice", "strategyKey", "strategyVersion", "plannedTargetPriceOrTimeStop"], status: "review_required", symbol: "BTC/USD" },
      { assetClass: "us_equity", missingFields: [], status: "managed", symbol: "AAPL" },
    ]);
  });

  it("selects the newest plan and sorts the bounded report deterministically", () => {
    expect(buildExitPlanReviewReport(
      [{ assetClass: "us_equity", symbol: "MSFT" }, { assetClass: "us_equity", symbol: "AAPL" }],
      [
        { assetClass: "us_equity", symbol: "AAPL", intentId: "old", entryPrice: "100", plannedStopPrice: "95", plannedTargetPrice: "110", strategyKey: "m", strategyVersion: "1.0.0", alpacaOrderId: "o", createdAt: new Date("2026-01-01") },
        { assetClass: "us_equity", symbol: "AAPL", intentId: "new", entryPrice: "100", plannedStopPrice: "95", plannedTargetPrice: "110", strategyKey: "m", strategyVersion: "1.0.0", alpacaOrderId: "o", updatedAt: new Date("2026-01-02") },
      ],
    ).map((row) => row.symbol)).toEqual(["AAPL", "MSFT"]);
  });

  it("matches slash-form broker symbols to canonical portfolio symbols", () => {
    expect(buildExitPlanReviewReport(
      [{ assetClass: "crypto", symbol: "BTCUSD" }],
      [{ alpacaOrderId: "order-1", assetClass: "crypto", entryPrice: "100", intentId: "intent-1", plannedStopPrice: "95", plannedTargetPrice: "104", strategyKey: "momentum", strategyVersion: "1.0.0", symbol: "BTC/USD" }],
    )).toEqual([{ assetClass: "crypto", missingFields: [], status: "managed", symbol: "BTCUSD" }]);
  });
});
