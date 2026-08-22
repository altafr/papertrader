import { describe, expect, it } from "vitest";
import { reconcilePaperOrder } from "./paper-recovery.js";

describe("paper order recovery", () => {
  it("preserves partial fills as non-terminal broker truth", () => {
    expect(reconcilePaperOrder({ brokerClientOrderId: "intent-1-order", brokerStatus: "partially_filled", expectedClientOrderId: "intent-1-order", expectedQuantity: "1", filledQuantity: "0.4" })).toEqual({ filledQuantity: "0.4", retryable: false, status: "partially_filled", terminal: false });
  });

  it("rejects mismatched IDs, overfills, unknown statuses, and terminal regressions", () => {
    expect(() => reconcilePaperOrder({ brokerClientOrderId: "other", brokerStatus: "accepted", expectedClientOrderId: "intent-1-order", expectedQuantity: "1" })).toThrow("client ID");
    expect(() => reconcilePaperOrder({ brokerClientOrderId: "intent-1-order", brokerStatus: "filled", expectedClientOrderId: "intent-1-order", expectedQuantity: "1", filledQuantity: "1.1" })).toThrow("quantity");
    expect(() => reconcilePaperOrder({ brokerClientOrderId: "intent-1-order", brokerStatus: "unknown", expectedClientOrderId: "intent-1-order", expectedQuantity: "1" })).toThrow("unsupported");
    expect(() => reconcilePaperOrder({ brokerClientOrderId: "intent-1-order", brokerStatus: "accepted", expectedClientOrderId: "intent-1-order", expectedQuantity: "1", previousStatus: "filled" })).toThrow("regress");
  });
});
