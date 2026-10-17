import { describe, expect, it, vi } from "vitest";
import { createPaperPositionProtection } from "./position-protection.js";

const response = (status: number, body: unknown) => new Response(status === 204 ? null : JSON.stringify(body), { status });
const short = { symbol: "ASTS", side: "short" as const, intentId: "short-1", stopPrice: "49.14", targetPrice: "44.21" };
const position = { symbol: "ASTS", side: "short", qty: "-48" };
const stop = { id: "stop-1", symbol: "ASTS", side: "buy", type: "stop", qty: "48", status: "new", stop_price: "49.38" };
const target = { id: "target-1", symbol: "ASTS", side: "buy", type: "limit", qty: "48", status: "new", limit_price: "44.21", order_class: "oco", legs: [stop] };

describe("paper broker position protection", () => {
  it("restores an expired short bracket as GTC with an unsigned broker quantity and durable pre-write audit", async () => {
    const events: string[] = [];
    const fetchImpl = vi.fn<typeof fetch>(async (url, init) => {
      if (String(url).includes("/positions/")) return response(200, position);
      if (String(url).includes("by_client_order_id")) return response(404, {});
      if (init?.method === "POST") { events.push("post"); expect(JSON.parse(String(init.body))).toMatchObject({ qty: "48", side: "buy", order_class: "oco", time_in_force: "gtc", take_profit: { limit_price: "44.21" }, stop_loss: { stop_price: "49.14" } }); return response(201, target); }
      return response(200, []);
    });
    const adapter = createPaperPositionProtection({ apiKey: "key", secretKey: "secret", brokerConnectionEnabled: true, fetchImpl, audit: async (_mutation, phase) => { events.push(phase); } });
    await expect(adapter.ensure(short)).resolves.toBe("restored");
    expect(events).toEqual(["requested", "post", "confirmed"]);
  });

  it.each([{ side: "short" as const, qty: "-48", oldStop: "49.38", desired: "47.12", expected: "47.12" }, { side: "long" as const, qty: "48", oldStop: "45", desired: "46.111", expected: "46.12" }])("updates broker stops only in the favorable $side direction", async ({ side, qty, oldStop, desired, expected }) => {
    const closingSide = side === "short" ? "buy" : "sell";
    const patches: unknown[] = [];
    const adapter = createPaperPositionProtection({ apiKey: "key", secretKey: "secret", brokerConnectionEnabled: true, audit: async () => {}, fetchImpl: async (url, init) => {
      if (String(url).includes("/positions/")) return response(200, { ...position, side, qty });
      if (init?.method === "PATCH") { patches.push(JSON.parse(String(init.body))); return response(200, stop); }
      return response(200, [{ ...target, side: closingSide, legs: [{ ...stop, side: closingSide, stop_price: oldStop }] }]);
    } });
    await expect(adapter.ensure({ ...short, side, stopPrice: desired, targetPrice: side === "short" ? "44.21" : "55" })).resolves.toBe("ratcheted");
    expect(patches).toEqual([{ stop_price: expected }]);
    await expect(adapter.ensure({ ...short, side, stopPrice: side === "short" ? "51" : "44" })).resolves.toBe("protected");
    expect(patches).toHaveLength(1);
  });

  it("reuses an existing protective group after an ambiguous POST without duplicating it", async () => {
    const write = vi.fn();
    const adapter = createPaperPositionProtection({ apiKey: "key", secretKey: "secret", brokerConnectionEnabled: true, audit: async () => {}, fetchImpl: async (url, init) => {
      if (String(url).includes("/positions/")) return response(200, position);
      if (String(url).includes("by_client_order_id")) return response(200, target);
      if (init?.method === "POST") write();
      return response(200, []);
    } });
    await expect(adapter.ensure(short)).resolves.toBe("protected");
    expect(write).not.toHaveBeenCalled();
  });

  it("confirms cancellation and caps a closing order at the remaining position after a partial bracket fill", async () => {
    let canceled = false;
    let positionReads = 0;
    const adapter = createPaperPositionProtection({ apiKey: "key", secretKey: "secret", brokerConnectionEnabled: true, audit: async () => {}, fetchImpl: async (url, init) => {
      if (String(url).includes("/positions/")) return response(200, { ...position, qty: ++positionReads > 1 ? "-12" : "-48" });
      if (init?.method === "DELETE") { canceled = true; return response(204, null); }
      return response(200, canceled ? [] : [target]);
    } });
    await expect(adapter.prepareExit("ASTS", "short", "48")).resolves.toBe("12");
  });

  it("does not send a closing order when a bracket fills during cancellation", async () => {
    let reads = 0;
    const adapter = createPaperPositionProtection({ apiKey: "key", secretKey: "secret", brokerConnectionEnabled: true, audit: async () => {}, fetchImpl: async (url) => String(url).includes("/positions/") ? response(++reads === 1 ? 200 : 404, position) : response(200, []) });
    await expect(adapter.prepareExit("ASTS", "short", "48")).resolves.toBeUndefined();
  });

  it("fails closed on an in-flight exit or failed protective cancellation", async () => {
    let market = true;
    const adapter = createPaperPositionProtection({ apiKey: "key", secretKey: "secret", brokerConnectionEnabled: true, audit: async () => {}, fetchImpl: async (url, init) => {
      if (String(url).includes("/positions/")) return response(200, position);
      if (init?.method === "DELETE") return response(500, {});
      return response(200, market ? [{ ...stop, type: "market" }] : [target]);
    } });
    await expect(adapter.prepareExit("ASTS", "short", "48")).rejects.toThrow("in_flight");
    market = false;
    await expect(adapter.prepareExit("ASTS", "short", "48")).rejects.toThrow("paper_protection_http_500");
  });
});
