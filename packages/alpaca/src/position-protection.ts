import { createHash } from "node:crypto";
import { Decimal } from "decimal.js";
import { z } from "zod";
import { PAPER_TRADING_API_BASE_URL } from "@momentum/config";
import type { PaperOrderSubmitterOptions } from "./orders.js";

const orderSchema = z.object({ id: z.string(), symbol: z.string(), side: z.enum(["buy", "sell"]), type: z.string(), status: z.string(), qty: z.string(), filled_qty: z.string().nullable().optional(), stop_price: z.string().nullable().optional(), limit_price: z.string().nullable().optional(), order_class: z.string().optional() });
type Order = z.infer<typeof orderSchema>;
const nestedSchema = orderSchema.extend({ legs: z.array(orderSchema).nullable().optional() });
const positionSchema = z.object({ symbol: z.string(), side: z.enum(["long", "short"]), qty: z.string() });
export interface PositionProtectionRequest { readonly symbol: string; readonly side: "long" | "short"; readonly intentId: string; readonly stopPrice: string; readonly targetPrice: string; }
export interface ProtectionMutation { readonly action: "restore_bracket" | "ratchet_stop" | "cancel_for_exit"; readonly symbol: string; readonly orderId?: string; readonly clientOrderId?: string; readonly stopPrice?: string; readonly targetPrice?: string; }

/** Paper-only broker protection. Every write is preceded by a durable audit callback. */
export function createPaperPositionProtection(options: PaperOrderSubmitterOptions & { readonly audit: (mutation: ProtectionMutation, phase: "requested" | "confirmed") => Promise<void> }) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const request = async (path: string, init: RequestInit = {}) => {
    if (!options.brokerConnectionEnabled) throw new Error("Paper broker connection is disabled.");
    return fetchImpl(`${PAPER_TRADING_API_BASE_URL}${path}`, { ...init, signal: AbortSignal.timeout(10_000), headers: { "APCA-API-KEY-ID": options.apiKey, "APCA-API-SECRET-KEY": options.secretKey, "content-type": "application/json" } });
  };
  const checked = async (path: string, init?: RequestInit) => {
    const response = await request(path, init);
    if (!response.ok) throw new Error(`paper_protection_http_${response.status}`);
    return response;
  };
  const readPosition = async (symbol: string) => {
    const response = await request(`/v2/positions/${encodeURIComponent(symbol)}`);
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`paper_position_http_${response.status}`);
    return positionSchema.parse(await response.json());
  };
  const readOrders = async (symbol: string): Promise<Order[]> => {
    const response = await checked(`/v2/orders?status=open&nested=true&limit=500&symbols=${encodeURIComponent(symbol)}`);
    const parents = z.array(nestedSchema).parse(await response.json());
    return [...new Map(parents.flatMap((order) => [order, ...(order.legs ?? [])]).filter((order) => order.symbol === symbol).map((order) => [order.id, order])).values()];
  };
  const mutate = async (mutation: ProtectionMutation, path: string, init: RequestInit) => {
    await options.audit(mutation, "requested");
    const response = await checked(path, init);
    await options.audit(mutation, "confirmed");
    return response;
  };
  return {
    /** Release reservations, confirm cancellation, then re-read the remaining broker quantity. */
    async prepareExit(symbol: string, side: "long" | "short", requestedQuantity: string): Promise<string | undefined> {
      let position = await readPosition(symbol);
      if (!position) return undefined;
      if (position.side !== side) throw new Error("paper_exit_direction_mismatch");
      const closingSide = side === "short" ? "buy" : "sell";
      const orders = await readOrders(symbol);
      if (orders.some((order) => order.side !== closingSide || order.type === "market" || !["stop", "stop_limit", "limit"].includes(order.type))) throw new Error("paper_exit_order_in_flight");
      // Cancel group parents first; canceled siblings may disappear immediately.
      for (const order of orders.filter((order) => order.order_class === "oco" || order.order_class === "bracket")) {
        if (!(await readOrders(symbol)).some((open) => open.id === order.id)) continue;
        await mutate({ action: "cancel_for_exit", symbol, orderId: order.id }, `/v2/orders/${order.id}`, { method: "DELETE" });
      }
      for (const order of await readOrders(symbol)) await mutate({ action: "cancel_for_exit", symbol, orderId: order.id }, `/v2/orders/${order.id}`, { method: "DELETE" });
      if ((await readOrders(symbol)).length > 0) throw new Error("paper_exit_cancellation_pending");
      position = await readPosition(symbol);
      if (!position) return undefined;
      if (position.side !== side) throw new Error("paper_exit_direction_mismatch");
      return Decimal.min(new Decimal(requestedQuantity).abs(), new Decimal(position.qty).abs()).toFixed();
    },
    async ensure(input: PositionProtectionRequest): Promise<"closed" | "protected" | "restored" | "ratcheted" | "exit_in_flight"> {
      const position = await readPosition(input.symbol);
      if (!position) return "closed";
      if (position.side !== input.side) throw new Error("paper_protection_direction_mismatch");
      const side = input.side === "short" ? "buy" : "sell";
      const orders = await readOrders(input.symbol);
      if (orders.some((order) => order.type === "market")) return "exit_in_flight";
      if (orders.some((order) => order.side !== side)) throw new Error("paper_protection_conflicting_order");
      const stop = orders.find((order) => order.type === "stop" && order.stop_price);
      const target = orders.find((order) => order.type === "limit" && order.limit_price);
      const stopPrice = new Decimal(input.stopPrice).toDecimalPlaces(2, input.side === "short" ? Decimal.ROUND_FLOOR : Decimal.ROUND_CEIL).toFixed(2);
      if (stop && target) {
        const quantity = new Decimal(position.qty).abs();
        if (!new Decimal(stop.qty).minus(stop.filled_qty ?? "0").eq(quantity) || !new Decimal(target.qty).minus(target.filled_qty ?? "0").eq(quantity)) throw new Error("paper_protection_quantity_mismatch");
        if (stop.status === "pending_replace") return "protected";
        const improves = input.side === "short" ? new Decimal(stopPrice).lt(stop.stop_price!) : new Decimal(stopPrice).gt(stop.stop_price!);
        if (!improves) return "protected";
        await mutate({ action: "ratchet_stop", symbol: input.symbol, orderId: stop.id, stopPrice }, `/v2/orders/${stop.id}`, { method: "PATCH", body: JSON.stringify({ stop_price: stopPrice }) });
        return "ratcheted";
      }
      if (orders.length) throw new Error("paper_protection_incomplete_group");
      const quantity = new Decimal(position.qty).abs().toFixed();
      const targetPrice = new Decimal(input.targetPrice).toFixed(2);
      if (input.side === "short" ? new Decimal(stopPrice).lte(targetPrice) : new Decimal(stopPrice).gte(targetPrice)) throw new Error("paper_protection_exit_threshold_reached");
      const clientOrderId = `protect-${createHash("sha256").update(`${input.intentId}:${quantity}:${stopPrice}:${targetPrice}`).digest("hex").slice(0, 36)}`;
      const existing = await request(`/v2/orders:by_client_order_id?client_order_id=${clientOrderId}`);
      if (existing.ok) {
        const order = orderSchema.parse(await existing.json());
        if (["new", "accepted", "pending_new", "held"].includes(order.status)) return "protected";
        throw new Error("paper_protection_terminal_order_requires_reconciliation");
      }
      if (existing.status !== 404) throw new Error("paper_protection_lookup_failed");
      await mutate({ action: "restore_bracket", symbol: input.symbol, clientOrderId, stopPrice, targetPrice }, "/v2/orders", { method: "POST", body: JSON.stringify({ client_order_id: clientOrderId, symbol: input.symbol, qty: quantity, side, type: "limit", order_class: "oco", time_in_force: "gtc", take_profit: { limit_price: targetPrice }, stop_loss: { stop_price: stopPrice } }) });
      return "restored";
    },
  };
}
