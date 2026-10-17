import { describe, expect, it } from "vitest";
import { createPaperExitOrderSubmitter } from "./orders.js";

const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const order = { asset_class: "us_equity", client_order_id: "exit-1", id: "alpaca-exit-1", qty: "1", side: "sell", status: "accepted", symbol: "AAPL", type: "market" };

describe("paper exit order submitter", () => {
  it("retries only broker-confirmed terminal exits with a stable audited replacement ID", async () => {
    const ids: string[] = [];
    const audits: string[] = [];
    const submitter = createPaperExitOrderSubmitter({ apiKey: "key", secretKey: "secret", brokerConnectionEnabled: true, beforeExitRetry: async (retry) => { audits.push(retry.clientOrderId); }, fetchImpl: async (url, init) => {
      if (init?.method === "POST") { const body = JSON.parse(String(init.body)); ids.push(body.client_order_id); expect(body.side).toBe("buy"); return response(201, { ...order, side: "buy", client_order_id: body.client_order_id }); }
      return String(url).includes("client_order_id=exit-1") ? response(200, { ...order, status: "expired" }) : response(404, {});
    } });
    const request = { assetClass: "us_equity" as const, clientOrderId: "exit-1", closingSide: "buy" as const, quantity: "48", decision: { exitPrice: "40", reason: "profit_target" as const, shouldExit: true, symbol: "ASTS" }, timeInForce: "gtc" as const, type: "market" as const };
    await submitter.submitExit(request);
    await submitter.submitExit(request);
    expect(ids[0]).toBe(ids[1]);
    expect(ids[0]).toMatch(/^retry-[a-f0-9]+-exit-profit_target$/);
    expect(audits).toEqual(ids);
  });
  it("does not retry an ambiguous idempotency lookup", async () => {
    let posts = 0;
    const submitter = createPaperExitOrderSubmitter({ apiKey: "key", secretKey: "secret", brokerConnectionEnabled: true, fetchImpl: async (_url, init) => { if (init?.method === "POST") posts++; return response(503, {}); } });
    await expect(submitter.submitExit({ assetClass: "us_equity", clientOrderId: "exit-1", quantity: "1", decision: { exitPrice: "95", reason: "stop_loss", shouldExit: true, symbol: "AAPL" }, timeInForce: "gtc", type: "market" })).rejects.toThrow("lookup failed");
    expect(posts).toBe(0);
  });
  it("requires a deterministic exit and submits sell exactly once", async () => {
    const calls: string[] = [];
    const submitter = createPaperExitOrderSubmitter({ apiKey: "key", brokerConnectionEnabled: true, secretKey: "secret", fetchImpl: async (url, init) => { calls.push(`${init?.method}:${url}`); return calls.length === 1 ? response(404, {}) : response(201, order); } });
    await expect(submitter.submitExit({ assetClass: "us_equity", clientOrderId: "exit-1", decision: { exitPrice: "95", reason: "stop_loss", shouldExit: true, symbol: "AAPL" }, quantity: "1", timeInForce: "day", type: "market" })).resolves.toMatchObject({ alpacaOrderId: "alpaca-exit-1", symbol: "AAPL" });
    expect(calls).toHaveLength(2);
    await expect(submitter.submitExit({ assetClass: "us_equity", clientOrderId: "exit-2", decision: { exitPrice: "95", shouldExit: false, symbol: "AAPL" }, quantity: "1", timeInForce: "day", type: "market" })).rejects.toThrow("deterministic exit");
  });
});
