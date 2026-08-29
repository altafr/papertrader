import type { PaperAccountState, PaperOrder, PaperPosition } from "@momentum/alpaca";

export interface ExitPlanBrokerCandidate {
  readonly alpacaOrderId: string;
  readonly assetClass: string;
  readonly filledQuantity?: string;
  readonly quantity?: string;
  readonly status: string;
  readonly submittedAt?: string;
  readonly symbol: string;
  readonly type: string;
}

export interface ExitPlanBrokerReviewRow {
  readonly assetClass: string;
  readonly brokerCandidates: readonly ExitPlanBrokerCandidate[];
  readonly symbol: string;
}

const canonicalSymbol = (symbol: string): string => symbol.replaceAll("/", "").toUpperCase();

const isFilledBuyOrder = (order: PaperOrder): boolean =>
  order.side.toLowerCase() === "buy" && ["filled", "partially_filled"].includes(order.status.toLowerCase()) && Boolean(order.filledQuantity && order.filledQuantity !== "0");

const toCandidate = (order: PaperOrder): ExitPlanBrokerCandidate => ({
  alpacaOrderId: order.alpacaOrderId,
  assetClass: order.assetClass,
  ...(order.filledQuantity ? { filledQuantity: order.filledQuantity } : {}),
  ...(order.quantity ? { quantity: order.quantity } : {}),
  status: order.status,
  ...(order.submittedAt ? { submittedAt: order.submittedAt } : {}),
  symbol: order.symbol,
  type: order.type,
});

/** Build a bounded, read-only broker provenance report for open positions. */
export function buildExitPlanBrokerReview(state: Pick<PaperAccountState, "orders" | "positions">): readonly ExitPlanBrokerReviewRow[] {
  const orders = state.orders.filter(isFilledBuyOrder);
  return [...state.positions]
    .sort((left, right) => `${left.assetClass}:${left.symbol}`.localeCompare(`${right.assetClass}:${right.symbol}`))
    .slice(0, 100)
    .map((position: PaperPosition) => ({
      assetClass: position.assetClass,
      brokerCandidates: orders
        .filter((order) => order.assetClass === position.assetClass && canonicalSymbol(order.symbol) === canonicalSymbol(position.symbol))
        .slice(0, 100)
        .map(toCandidate),
      symbol: position.symbol,
    }));
}
