import type { PaperAccountState, PaperOrder, PaperPosition } from "@momentum/alpaca";
import * as DecimalModule from "decimal.js";

interface DecimalValue { eq(value: DecimalValue): boolean; lte(value: DecimalValue): boolean; greaterThan(value: DecimalValue): boolean; isNegative(): boolean; isZero(): boolean; plus(value: DecimalValue): DecimalValue; minus(value: DecimalValue): DecimalValue; }
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;
export const CRYPTO_POSITION_QUANTITY_TOLERANCE = "0.0001";

const canonical = (value: string): string => value.replaceAll("/", "").toUpperCase();

export function selectLegacyPositionBrokerOrders(state: Pick<PaperAccountState, "orders" | "positions">, input: { readonly alpacaOrderIds: readonly string[]; readonly assetClass: string; readonly symbol: string }): { readonly orders: readonly PaperOrder[]; readonly position: PaperPosition } {
  const position = state.positions.find((candidate) => candidate.assetClass === input.assetClass && canonical(candidate.symbol) === canonical(input.symbol));
  if (!position) throw new Error("Open paper position was not found.");
  const orders = input.alpacaOrderIds.map((alpacaOrderId) => state.orders.find((candidate) => candidate.alpacaOrderId === alpacaOrderId));
  if (orders.some((order) => !order || order.assetClass !== input.assetClass || canonical(order.symbol) !== canonical(position.symbol) || order.side.toLowerCase() !== "buy" || !["filled", "partially_filled"].includes(order.status.toLowerCase()) || !order.filledQuantity || new Decimal(order.filledQuantity).lte(new Decimal("0")))) throw new Error("Selected Alpaca order is not a matching filled buy order.");
  const selectedOrders = orders as PaperOrder[];
  const total = selectedOrders.reduce((sum, order) => sum.plus(new Decimal(order.filledQuantity!)), new Decimal("0"));
  const difference = total.minus(new Decimal(position.quantity));
  if (difference.isNegative() || (input.assetClass === "crypto" ? difference.greaterThan(new Decimal(CRYPTO_POSITION_QUANTITY_TOLERANCE)) : !difference.isZero())) throw new Error("Selected Alpaca order quantities do not match the open position quantity.");
  return { orders: selectedOrders, position };
}

export function selectLegacyPositionBrokerOrder(state: Pick<PaperAccountState, "orders" | "positions">, input: { readonly alpacaOrderId: string; readonly assetClass: string; readonly symbol: string }): { readonly order: PaperOrder; readonly position: PaperPosition } {
  const result = selectLegacyPositionBrokerOrders(state, { ...input, alpacaOrderIds: [input.alpacaOrderId] });
  return { order: result.orders[0]!, position: result.position };
}
