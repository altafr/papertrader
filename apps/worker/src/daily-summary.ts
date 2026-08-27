export type DailySummaryInput = {
  readonly buyingPower: string;
  readonly cash: string;
  readonly equity: string;
  readonly lastEquity?: string;
  readonly orders: number;
  readonly positions: readonly { readonly marketValue: string; readonly unrealizedPl: string }[];
};

function metric(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? "not reported" : value.toFixed(2);
}

/** Format the end-of-session summary from persisted reconciliation values only. */
export function formatDailyPortfolioSummary(input: DailySummaryInput): string {
  const unrealizedPnl = input.positions.reduce((sum, position) => sum + Number(position.unrealizedPl), 0);
  const dayPnl = input.lastEquity === undefined ? undefined : Number(input.equity) - Number(input.lastEquity);
  const exposure = input.positions.reduce((sum, position) => sum + Number(position.marketValue), 0);
  return `Market session summary (paper): equity ${input.equity}, cash ${input.cash}, buying power ${input.buyingPower}, day P/L ${metric(dayPnl)}, unrealized P/L ${metric(unrealizedPnl)}, gross exposure ${metric(exposure)}, open positions ${input.positions.length}, tracked orders ${input.orders}.`;
}
