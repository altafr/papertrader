import type { PaperAccountState, PaperOrder, PaperPosition } from "@momentum/alpaca";
import * as DecimalModule from "decimal.js";

interface DecimalValue { eq(value: DecimalValue): boolean; lte(value: DecimalValue): boolean; }
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

const canonical = (value: string): string => value.replaceAll("/", "").toUpperCase();

export function selectLegacyPositionBrokerOrder(state: Pick<PaperAccountState, "orders" | "positions">, input: { readonly alpacaOrderId: string; readonly assetClass: string; readonly symbol: string }): { readonly order: PaperOrder; readonly position: PaperPosition } {
  const position = state.positions.find((candidate) => candidate.assetClass === input.assetClass && canonical(candidate.symbol) === canonical(input.symbol));
  if (!position) throw new Error("Open paper position was not found.");
  const order = state.orders.find((candidate) => candidate.alpacaOrderId === input.alpacaOrderId);
  if (!order || order.assetClass !== input.assetClass || canonical(order.symbol) !== canonical(position.symbol) || order.side.toLowerCase() !== "buy" || !["filled", "partially_filled"].includes(order.status.toLowerCase()) || !order.filledQuantity || new Decimal(order.filledQuantity).lte(new Decimal("0"))) throw new Error("Selected Alpaca order is not a matching filled buy order.");
  if (!order.filledQuantity || !new Decimal(order.filledQuantity).eq(new Decimal(position.quantity))) throw new Error("Selected Alpaca order quantity does not match the open position quantity.");
  return { order, position };
}
