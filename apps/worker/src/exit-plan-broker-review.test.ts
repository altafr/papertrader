import { describe, expect, it } from "vitest";
import { buildExitPlanBrokerReview } from "./exit-plan-broker-review.js";

describe("exit-plan broker review", () => {
  it("matches slash and non-slash broker symbols without writing state", () => {
    const result = buildExitPlanBrokerReview({
      positions: [{ assetClass: "crypto", averageEntryPrice: "100", marketValue: "100", quantity: "1", symbol: "BTCUSD", unrealizedPl: "0" }, { assetClass: "us_equity", averageEntryPrice: "10", marketValue: "10", quantity: "1", symbol: "PFD", unrealizedPl: "0" }],
      orders: [
        { alpacaOrderId: "crypto-order", assetClass: "crypto", filledAveragePrice: "100.25", filledQuantity: "1", quantity: "1", side: "buy", status: "filled", symbol: "BTC/USD", type: "market" },
        { alpacaOrderId: "sell-order", assetClass: "crypto", filledQuantity: "1", quantity: "1", side: "sell", status: "filled", symbol: "BTC/USD", type: "market" },
        { alpacaOrderId: "open-order", assetClass: "us_equity", quantity: "1", side: "buy", status: "new", symbol: "PFD", type: "limit" },
      ],
    });
    expect(result).toEqual([
      { assetClass: "crypto", brokerCandidates: [{ alpacaOrderId: "crypto-order", assetClass: "crypto", filledAveragePrice: "100.25", filledQuantity: "1", quantity: "1", status: "filled", symbol: "BTC/USD", type: "market" }], brokerWeightedAverageFillPrice: "100.25", candidateFilledQuantityTotal: "1", coverage: "complete", positionQuantity: "1", symbol: "BTCUSD" },
      { assetClass: "us_equity", brokerCandidates: [], candidateFilledQuantityTotal: "0", coverage: "incomplete", positionQuantity: "1", symbol: "PFD" },
    ]);
  });
});
