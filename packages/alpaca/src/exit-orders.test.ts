import { describe, expect, it } from "vitest";
import { createPaperExitOrderSubmitter } from "./orders.js";

const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const order = { asset_class: "us_equity", client_order_id: "exit-1", id: "alpaca-exit-1", qty: "1", side: "sell", status: "accepted", symbol: "AAPL", type: "market" };

describe("paper exit order submitter", () => {
  it("requires a deterministic exit and submits sell exactly once", async () => {
    const calls: string[] = [];
    const submitter = createPaperExitOrderSubmitter({ apiKey: "key", brokerConnectionEnabled: true, secretKey: "secret", fetchImpl: async (url, init) => { calls.push(`${init?.method}:${url}`); return calls.length === 1 ? response(404, {}) : response(201, order); } });
    await expect(submitter.submitExit({ assetClass: "us_equity", clientOrderId: "exit-1", decision: { exitPrice: "95", reason: "stop_loss", shouldExit: true, symbol: "AAPL" }, quantity: "1", timeInForce: "day", type: "market" })).resolves.toMatchObject({ alpacaOrderId: "alpaca-exit-1", symbol: "AAPL" });
    expect(calls).toHaveLength(2);
    await expect(submitter.submitExit({ assetClass: "us_equity", clientOrderId: "exit-2", decision: { exitPrice: "95", shouldExit: false, symbol: "AAPL" }, quantity: "1", timeInForce: "day", type: "market" })).rejects.toThrow("deterministic exit");
  });
});
