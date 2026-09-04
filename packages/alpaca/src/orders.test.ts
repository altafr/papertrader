import { describe, expect, it } from "vitest";
import { classifyPaperOrderFailure, createPaperExitOrderSubmitter, createPaperOrderSubmitter, normalizeAlpacaOrderSymbol } from "./orders.js";

const approval = { approvalId: "intent-1:2026-01-10T00:03:00Z", intentId: "intent-1", status: "approved" as const };
const request = { approval, assetClass: "us_equity" as const, clientOrderId: "intent-1-order", quantity: "0.02", side: "buy" as const, symbol: "AAA", timeInForce: "day" as const, type: "market" as const };

function response(status: number, body: unknown): Response { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }); }
const order = { asset_class: "us_equity", client_order_id: "intent-1-order", id: "alpaca-1", qty: "0.02", side: "buy", status: "accepted", symbol: "AAA", type: "market" };

describe("paper order submitter", () => {
  it("normalizes legacy crypto symbols for broker orders", () => {
    expect(normalizeAlpacaOrderSymbol("crypto", "BTCUSD")).toBe("BTC/USD");
    expect(normalizeAlpacaOrderSymbol("crypto", "BTC/USD")).toBe("BTC/USD");
    expect(normalizeAlpacaOrderSymbol("us_equity", "AAPL")).toBe("AAPL");
  });
  it("classifies crypto entitlement failures without exposing provider response bodies", () => {
    expect(classifyPaperOrderFailure("crypto", 403)).toBe("crypto_order_entitlement_blocked");
    expect(classifyPaperOrderFailure("us_equity", 403)).toBe("paper_entry_http_403");
    expect(classifyPaperOrderFailure("crypto", 429, true)).toBe("paper_exit_http_429");
  });

  it("looks up by client ID before posting and submits only approved paper orders", async () => {
    const calls: string[] = [];
    const submitter = createPaperOrderSubmitter({ apiKey: "key", brokerConnectionEnabled: true, secretKey: "secret", fetchImpl: async (url, init) => { calls.push(`${init?.method}:${url}`); return calls.length === 1 ? response(404, {}) : response(201, order); } });
    await expect(submitter.submit(request)).resolves.toMatchObject({ alpacaOrderId: "alpaca-1", clientOrderId: "intent-1-order" });
    expect(calls[0]).toContain("orders:by_client_order_id"); expect(calls[1]).toContain("/v2/orders");
  });

  it("returns the existing order without posting on retry", async () => {
    let calls = 0;
    const submitter = createPaperOrderSubmitter({ apiKey: "key", brokerConnectionEnabled: true, secretKey: "secret", fetchImpl: async () => { calls += 1; return response(200, order); } });
    await expect(submitter.submit(request)).resolves.toMatchObject({ alpacaOrderId: "alpaca-1" });
    expect(calls).toBe(1);
  });

  it("submits equity entries as Alpaca bracket orders", async () => {
    let body = "";
    const submitter = createPaperOrderSubmitter({ apiKey: "key", brokerConnectionEnabled: true, secretKey: "secret", fetchImpl: async (_url, init) => {
      if (init?.method === "POST") body = String(init.body ?? "");
      return body ? response(201, order) : response(404, {});
    } });
    await submitter.submit({ ...request, entryPrice: "100.00", plannedStopPrice: "95.00", plannedTargetPrice: "104.00" });
    expect(JSON.parse(body)).toMatchObject({ order_class: "bracket", take_profit: { limit_price: "104.00" }, stop_loss: { stop_price: "95.00" } });
  });

  it("normalizes crypto market orders to Alpaca-supported gtc time in force", async () => {
    let body = "";
    const submitter = createPaperOrderSubmitter({ apiKey: "key", brokerConnectionEnabled: true, secretKey: "secret", fetchImpl: async (_url, init) => {
      if (init?.method === "POST") body = String(init.body ?? "");
      return body ? response(201, { ...order, asset_class: "crypto", symbol: "BTC/USD" }) : response(404, {});
    } });
    await submitter.submit({ ...request, assetClass: "crypto", symbol: "BTC/USD" });
    expect(JSON.parse(body).time_in_force).toBe("gtc");
  });

  it("normalizes legacy crypto symbols on deterministic exits", async () => {
    let body = "";
    const submitter = createPaperExitOrderSubmitter({ apiKey: "key", brokerConnectionEnabled: true, secretKey: "secret", fetchImpl: async (_url, init) => {
      if (init?.method === "POST") body = String(init.body ?? "");
      return body ? response(201, { ...order, asset_class: "crypto", symbol: "BTC/USD" }) : response(404, {});
    } });
    await submitter.submitExit({ assetClass: "crypto", clientOrderId: "intent-1-exit-stop_loss", decision: { exitPrice: "95", reason: "stop_loss", shouldExit: true, symbol: "BTCUSD" }, quantity: "1", timeInForce: "gtc", type: "market" });
    expect(JSON.parse(body).symbol).toBe("BTC/USD");
  });

  it("fails closed when disabled or approval is rejected", async () => {
    const disabled = createPaperOrderSubmitter({ apiKey: "key", brokerConnectionEnabled: false, secretKey: "secret", fetchImpl: async () => response(500, {}) });
    await expect(disabled.submit(request)).rejects.toThrow("disabled");
    const rejected = { ...request, approval: { ...approval, status: "rejected" as const } };
    const enabled = createPaperOrderSubmitter({ apiKey: "key", brokerConnectionEnabled: true, secretKey: "secret", fetchImpl: async () => response(500, {}) });
    await expect(enabled.submit(rejected)).rejects.toThrow("risk approval");
  });
});
