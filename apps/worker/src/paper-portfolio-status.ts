export interface PaperPortfolioStatus {
  readonly capturedAt: string | null;
  readonly cash: string | null;
  readonly equity: string | null;
  readonly positions: readonly { readonly assetClass: string; readonly marketValue: string; readonly symbol: string; readonly unrealizedPl: string; readonly quantity: string }[];
}

/** Bound the operator snapshot to reconciled, non-secret portfolio facts. */
export function buildPaperPortfolioStatus(input: { readonly capturedAt?: unknown; readonly cash?: unknown; readonly equity?: unknown; readonly positions?: readonly unknown[] }): PaperPortfolioStatus {
  const decimal = (value: unknown) => typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value) ? value : null;
  const capturedAt = input.capturedAt instanceof Date ? input.capturedAt.toISOString() : typeof input.capturedAt === "string" && Number.isFinite(Date.parse(input.capturedAt)) ? new Date(input.capturedAt).toISOString() : null;
  const positions = (input.positions ?? []).filter((value): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)).slice(0, 25).flatMap((position) => {
    const assetClass = position.assetClass;
    const symbol = position.symbol;
    const quantity = decimal(position.quantity);
    const marketValue = decimal(position.marketValue);
    const unrealizedPl = decimal(position.unrealizedPl);
    if ((assetClass !== "crypto" && assetClass !== "us_equity") || typeof symbol !== "string" || symbol.length === 0 || quantity === null || marketValue === null || unrealizedPl === null) return [];
    return [{ assetClass, marketValue, quantity, symbol, unrealizedPl }];
  });
  return { capturedAt, cash: decimal(input.cash), equity: decimal(input.equity), positions };
}
