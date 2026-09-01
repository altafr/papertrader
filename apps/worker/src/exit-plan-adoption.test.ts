import { describe, expect, it } from "vitest";
import { buildLegacyExitPlanProposal, getWeightedAverageFilledPrice, matchesWeightedBrokerEntryPrice, selectLegacyPositionBrokerOrder, selectLegacyPositionBrokerOrders } from "./exit-plan-adoption.js";

const position = { assetClass: "crypto", averageEntryPrice: "100", marketValue: "100", quantity: "0.001", symbol: "BTCUSD", unrealizedPl: "0" } as const;

describe("legacy position adoption", () => {
  it("builds non-authoritative stop and target suggestions from broker entry evidence", () => {
    expect(buildLegacyExitPlanProposal("100")).toEqual({ entryPrice: "100", requiresOperatorApproval: true, suggestedStopPrice: "95.01000000", suggestedTargetPrice: "104.00000000" });
  });

  it("derives a broker-linked weighted entry price from selected fills", () => {
    expect(getWeightedAverageFilledPrice([
      { alpacaOrderId: "order-1", assetClass: "crypto", filledAveragePrice: "100", filledQuantity: "0.001", quantity: "0.001", side: "buy", status: "filled", symbol: "BTC/USD", type: "market" },
      { alpacaOrderId: "order-2", assetClass: "crypto", filledAveragePrice: "110", filledQuantity: "0.002", quantity: "0.002", side: "buy", status: "filled", symbol: "BTC/USD", type: "market" },
    ])).toBe("106.66666666666666667");
    expect(getWeightedAverageFilledPrice([{ alpacaOrderId: "order-1", assetClass: "crypto", filledQuantity: "0.001", quantity: "0.001", side: "buy", status: "filled", symbol: "BTC/USD", type: "market" }])).toBeUndefined();
    const fill = { alpacaOrderId: "order-1", assetClass: "crypto", filledAveragePrice: "100", filledQuantity: "0.001", quantity: "0.001", side: "buy", status: "filled", symbol: "BTC/USD", type: "market" } as const;
    expect(matchesWeightedBrokerEntryPrice("100.0000", [fill])).toBe(true);
    expect(matchesWeightedBrokerEntryPrice("101", [fill])).toBe(false);
  });

  it("requires an exact filled buy order and quantity match", () => {
    expect(selectLegacyPositionBrokerOrder({ positions: [position], orders: [{ alpacaOrderId: "order-1", assetClass: "crypto", filledQuantity: "0.001", quantity: "0.001", side: "buy", status: "filled", symbol: "BTC/USD", type: "market" }] }, { alpacaOrderId: "order-1", assetClass: "crypto", symbol: "BTCUSD" }).order.alpacaOrderId).toBe("order-1");
    expect(() => selectLegacyPositionBrokerOrder({ positions: [position], orders: [{ alpacaOrderId: "order-2", assetClass: "crypto", filledQuantity: "0.002", quantity: "0.002", side: "buy", status: "filled", symbol: "BTC/USD", type: "market" }] }, { alpacaOrderId: "order-2", assetClass: "crypto", symbol: "BTCUSD" })).toThrow("quantity");
  });

  it("supports an aggregate position composed of multiple reviewed fills", () => {
    const state = { positions: [{ ...position, quantity: "0.002" }], orders: [
      { alpacaOrderId: "order-1", assetClass: "crypto", filledQuantity: "0.001", quantity: "0.001", side: "buy", status: "filled", symbol: "BTC/USD", type: "market" },
      { alpacaOrderId: "order-2", assetClass: "crypto", filledQuantity: "0.001", quantity: "0.001", side: "buy", status: "filled", symbol: "BTC/USD", type: "market" },
    ] };
    expect(selectLegacyPositionBrokerOrders(state, { alpacaOrderIds: ["order-1", "order-2"], assetClass: "crypto", symbol: "BTCUSD" }).orders).toHaveLength(2);
    expect(() => selectLegacyPositionBrokerOrders(state, { alpacaOrderIds: ["order-1"], assetClass: "crypto", symbol: "BTCUSD" })).toThrow("quantity");
  });

  it("allows only the documented crypto net-position dust tolerance", () => {
    const state = { positions: [{ ...position, quantity: "0.00095" }], orders: [{ alpacaOrderId: "order-1", assetClass: "crypto", filledQuantity: "0.001", quantity: "0.001", side: "buy", status: "filled", symbol: "BTC/USD", type: "market" }] };
    expect(selectLegacyPositionBrokerOrders(state, { alpacaOrderIds: ["order-1"], assetClass: "crypto", symbol: "BTCUSD" }).orders).toHaveLength(1);
    expect(() => selectLegacyPositionBrokerOrders({ positions: [{ ...position, quantity: "0.0008" }], orders: state.orders }, { alpacaOrderIds: ["order-1"], assetClass: "crypto", symbol: "BTCUSD" })).toThrow("quantity");
  });
});
