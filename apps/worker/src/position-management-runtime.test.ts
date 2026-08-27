import { describe, expect, it } from "vitest";

import { getPaperOrderStatusTransitions, getPositionDetectedDedupeKey, getPositionExitDecisionDedupeKey, getPositionExitIntentId, groupPositionSymbolsByAssetClass } from "./position-management-runtime.js";

describe("paper order status transitions", () => {
  it("returns only changed orders", () => {
    expect(getPaperOrderStatusTransitions([{ alpacaOrderId: "one", status: "accepted", symbol: "AAPL" }, { alpacaOrderId: "two", status: "filled", symbol: "MSFT" }], [{ alpacaOrderId: "one", status: "filled", symbol: "AAPL" }, { alpacaOrderId: "two", status: "filled", symbol: "MSFT" }, { alpacaOrderId: "three", status: "accepted", symbol: "TSLA" }])).toEqual([{ alpacaOrderId: "one", from: "accepted", status: "filled", symbol: "AAPL" }]);
  });
});

describe("position market-data grouping", () => {
  it("keeps equity and crypto symbols on their own Alpaca data routes", () => {
    expect(groupPositionSymbolsByAssetClass([
      { assetClass: "us_equity", symbol: "AAPL" },
      { assetClass: "crypto", symbol: "BTC/USD" },
      { assetClass: "crypto", symbol: "BTC/USD" },
    ])).toEqual([
      { assetClass: "us_equity", symbols: ["AAPL"] },
      { assetClass: "crypto", symbols: ["BTC/USD"] },
    ]);
  });
});

describe("position alert deduplication", () => {
  it("uses stable keys across scheduler restarts and repeated passes", () => {
    expect(getPositionDetectedDedupeKey("crypto", "BTC/USD", "intent-1")).toBe("position_detected:crypto:BTC/USD:intent-1");
    expect(getPositionDetectedDedupeKey("unexpected", "AAPL")).toBe("position_detected:us_equity:AAPL:unknown");
    expect(getPositionExitDecisionDedupeKey("intent-1", "stop_loss")).toBe("position_exit_decision:intent-1:stop_loss");
    expect(getPositionExitIntentId("intent-1-exit-stop_loss")).toBe("intent-1:exit");
  });
});
