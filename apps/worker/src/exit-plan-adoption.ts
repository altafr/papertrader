import type { PaperAccountState, PaperOrder, PaperPosition } from "@momentum/alpaca";
import * as DecimalModule from "decimal.js";

interface DecimalValue { div(value: DecimalValue): DecimalValue; eq(value: DecimalValue): boolean; lte(value: DecimalValue): boolean; greaterThan(value: DecimalValue): boolean; isNegative(): boolean; isZero(): boolean; plus(value: DecimalValue): DecimalValue; minus(value: DecimalValue): DecimalValue; times(value: DecimalValue): DecimalValue; toDecimalPlaces(decimalPlaces: number): DecimalValue; toFixed(decimalPlaces?: number): string; }
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;
export const CRYPTO_POSITION_QUANTITY_TOLERANCE = "0.0001";

const canonical = (value: string): string => value.replaceAll("/", "").toUpperCase();

export interface LegacyExitPlanProposal {
  readonly entryPrice: string;
  readonly requiresOperatorApproval: true;
  readonly suggestedStopPrice: string;
  readonly suggestedTargetPrice: string;
}

/** Build non-authoritative defaults from broker evidence for faster operator review. */
export function buildLegacyExitPlanProposal(entryPrice: string): LegacyExitPlanProposal {
  const entry = new Decimal(entryPrice);
  return {
    entryPrice,
    requiresOperatorApproval: true,
    // 95.01% keeps rounding strictly inside the documented 5% adverse limit.
    suggestedStopPrice: entry.times(new Decimal("0.9501")).toDecimalPlaces(8).toFixed(8),
    suggestedTargetPrice: entry.times(new Decimal("1.04")).toDecimalPlaces(8).toFixed(8),
  };
}

/** Derive a broker-linked entry price from the selected filled buys. */
export function getWeightedAverageFilledPrice(orders: readonly PaperOrder[]): string | undefined {
  if (orders.length === 0 || orders.some((order) => !order.filledQuantity || !order.filledAveragePrice)) return undefined;
  const quantity = orders.reduce((sum, order) => sum.plus(new Decimal(order.filledQuantity!)), new Decimal("0"));
  if (quantity.isZero()) return undefined;
  const notional = orders.reduce((sum, order) => sum.plus(new Decimal(order.filledQuantity!).times(new Decimal(order.filledAveragePrice!))), new Decimal("0"));
  return String(notional.div(quantity));
}

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
