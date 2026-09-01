export type DailySummaryInput = {
  readonly buyingPower: string;
  readonly cash: string;
  readonly equity: string;
  readonly lastEquity?: string;
  readonly orders: number;
  readonly unmanagedPositions?: number;
  readonly positions: readonly { readonly marketValue: string; readonly symbol?: string; readonly unrealizedPl: string; readonly effectiveStopPrice?: string | null; readonly plannedStopPrice?: string | null; readonly plannedTargetPrice?: string | null }[];
};

function canonicalSymbol(symbol: string): string {
  return symbol.replaceAll("/", "").trim().toUpperCase();
}

export function countUnmanagedPositions(
  positions: readonly { readonly assetClass: string; readonly symbol: string }[],
  plans: readonly { readonly assetClass: string; readonly symbol: string }[],
): number {
  const managed = new Set(plans.map((plan) => `${plan.assetClass}:${canonicalSymbol(plan.symbol)}`));
  return positions.filter((position) => !managed.has(`${position.assetClass}:${canonicalSymbol(position.symbol)}`)).length;
}

export function attachPositionProtection<T extends { readonly assetClass: string; readonly symbol: string }>(positions: readonly T[], plans: readonly { readonly assetClass: string; readonly symbol: string; readonly plannedStopPrice?: string | null; readonly trailingStopPrice?: string | null; readonly plannedTargetPrice?: string | null }[]): readonly (T & { readonly effectiveStopPrice?: string; readonly plannedStopPrice?: string; readonly plannedTargetPrice?: string })[] {
  const byKey = new Map(plans.map((plan) => [`${plan.assetClass}:${canonicalSymbol(plan.symbol)}`, plan]));
  return positions.map((position) => {
    const plan = byKey.get(`${position.assetClass}:${canonicalSymbol(position.symbol)}`);
    return plan ? { ...position, ...(plan.trailingStopPrice ? { effectiveStopPrice: plan.trailingStopPrice } : {}), ...(plan.plannedStopPrice ? { plannedStopPrice: plan.plannedStopPrice } : {}), ...(plan.plannedTargetPrice ? { plannedTargetPrice: plan.plannedTargetPrice } : {}) } : position;
  });
}

function metric(value: string | null | undefined): string {
  if (value === undefined || value === null) return "not reported";
  try { return formatDecimalString(value); } catch { return "not reported"; }
}

function sum(values: readonly string[]): string | undefined {
  try { return values.reduce((total, value) => addDecimalStrings(total, value), "0"); } catch { return undefined; }
}

/** Format the end-of-session summary from persisted reconciliation values only. */
export function formatDailyPortfolioSummary(input: DailySummaryInput): string {
  const unrealizedPnl = sum(input.positions.map((position) => position.unrealizedPl));
  const dayPnl = input.lastEquity === undefined ? undefined : (() => { try { return subtractDecimalStrings(input.equity, input.lastEquity); } catch { return undefined; } })();
  const exposure = sum(input.positions.map((position) => position.marketValue));
  const positionDigest = input.positions.slice(0, 10).map((position) => `${position.symbol ?? "unknown"} ${metric(position.unrealizedPl)}`).join(", ") || "none";
  const protectionDigest = input.positions.slice(0, 10).filter((position) => position.effectiveStopPrice || position.plannedStopPrice || position.plannedTargetPrice).map((position) => `${position.symbol ?? "unknown"} stop ${metric(position.effectiveStopPrice ?? position.plannedStopPrice)} target ${metric(position.plannedTargetPrice)}`).join(", ");
  return `Market session summary (paper): equity ${metric(input.equity)}, cash ${metric(input.cash)}, buying power ${metric(input.buyingPower)}, day P/L ${metric(dayPnl)}, unrealized P/L ${metric(unrealizedPnl)}, gross exposure ${metric(exposure)}, open positions ${input.positions.length}, position P/L [${positionDigest}]${protectionDigest ? `, protection [${protectionDigest}]` : ""}, tracked orders ${input.orders}${input.unmanagedPositions === undefined ? "." : `, unmanaged positions ${input.unmanagedPositions}.`}`;
}
import { addDecimalStrings, formatDecimalString, subtractDecimalStrings } from "@momentum/domain";
