import { describe, expect, it } from "vitest";

import { getPaperOrderStatusTransitions } from "./position-management-runtime.js";

describe("paper order status transitions", () => {
  it("returns only changed orders", () => {
    expect(getPaperOrderStatusTransitions([{ alpacaOrderId: "one", status: "accepted", symbol: "AAPL" }, { alpacaOrderId: "two", status: "filled", symbol: "MSFT" }], [{ alpacaOrderId: "one", status: "filled", symbol: "AAPL" }, { alpacaOrderId: "two", status: "filled", symbol: "MSFT" }, { alpacaOrderId: "three", status: "accepted", symbol: "TSLA" }])).toEqual([{ alpacaOrderId: "one", from: "accepted", status: "filled", symbol: "AAPL" }]);
  });
});
