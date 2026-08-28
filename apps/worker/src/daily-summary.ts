export type DailySummaryInput = {
  readonly buyingPower: string;
  readonly cash: string;
  readonly equity: string;
  readonly lastEquity?: string;
  readonly orders: number;
  readonly positions: readonly { readonly marketValue: string; readonly unrealizedPl: string }[];
};

function metric(value: string | undefined): string {
  if (value === undefined) return "not reported";
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
  return `Market session summary (paper): equity ${input.equity}, cash ${input.cash}, buying power ${input.buyingPower}, day P/L ${metric(dayPnl)}, unrealized P/L ${metric(unrealizedPnl)}, gross exposure ${metric(exposure)}, open positions ${input.positions.length}, tracked orders ${input.orders}.`;
}
import { addDecimalStrings, formatDecimalString, subtractDecimalStrings } from "@momentum/domain";
