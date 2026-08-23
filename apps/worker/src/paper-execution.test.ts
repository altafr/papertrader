import { describe, expect, it } from "vitest";
import { executeApprovedPaperOrder } from "./paper-execution.js";

const order = { approval: { approvalId: "approval-1", intentId: "intent-1", status: "approved" as const }, assetClass: "us_equity" as const, clientOrderId: "intent-1-order", quantity: "0.02", side: "buy" as const, symbol: "AAA", timeInForce: "day" as const, type: "market" as const };
const mode = { enabled: true, mode: "paper_autopilot" as const };

describe("paper execution wiring", () => {
  it("records pending, submits, and reconciles broker truth", async () => {
    const events: string[] = [];
    const result = await executeApprovedPaperOrder({ autopilot: mode, order, persistence: { recordSubmission: async () => { events.push("pending"); }, reconcile: async () => { events.push("reconcile"); }, markFailed: async () => { events.push("failed"); } }, submitter: { submit: async () => ({ alpacaOrderId: "alpaca-1", assetClass: "us_equity", clientOrderId: order.clientOrderId, quantity: order.quantity, status: "accepted", symbol: order.symbol, type: order.type }) } });
    expect(result).toMatchObject({ intentId: "intent-1", status: "reconciled" }); expect(events).toEqual(["pending", "reconcile"]);
  });

  it("marks failed and never submits when Paper Autopilot is disabled", async () => {
    const events: string[] = [];
    await expect(executeApprovedPaperOrder({ autopilot: { enabled: false, mode: "disabled" }, order, persistence: { recordSubmission: async () => { events.push("pending"); }, reconcile: async () => { events.push("reconcile"); }, markFailed: async () => { events.push("failed"); } }, submitter: { submit: async () => { throw new Error("must not submit"); } } })).rejects.toThrow("disabled");
    expect(events).toEqual([]);
  });

  it("marks a submission failed when the broker call errors", async () => {
    const events: string[] = [];
    await expect(executeApprovedPaperOrder({ autopilot: mode, order, persistence: { recordSubmission: async () => { events.push("pending"); }, reconcile: async () => { events.push("reconcile"); }, markFailed: async () => { events.push("failed"); } }, submitter: { submit: async () => { throw new Error("broker failed"); } } })).rejects.toThrow("broker failed");
    expect(events).toEqual(["pending", "failed"]);
  });

  it("blocks submission before persistence when the global kill switch is active", async () => {
    const events: string[] = [];
    const previous = process.env.GLOBAL_KILL_SWITCH_ACTIVE;
    process.env.GLOBAL_KILL_SWITCH_ACTIVE = "true";
    try {
      await expect(executeApprovedPaperOrder({ autopilot: mode, order, persistence: { recordSubmission: async () => { events.push("pending"); }, reconcile: async () => { events.push("reconcile"); }, markFailed: async () => { events.push("failed"); } }, submitter: { submit: async () => { throw new Error("must not submit"); } } })).rejects.toThrow("global kill switch");
      expect(events).toEqual([]);
    } finally {
      if (previous === undefined) delete process.env.GLOBAL_KILL_SWITCH_ACTIVE;
      else process.env.GLOBAL_KILL_SWITCH_ACTIVE = previous;
    }
  });
});
