export type UnmanagedPosition = { readonly assetClass: string; readonly symbol: string; readonly missingFields?: readonly string[] };
export type ActiveExitPosition = UnmanagedPosition;
export type PositionMetadata = UnmanagedPosition & {
  readonly entryPrice?: string;
  readonly plannedStopPrice?: string;
  readonly plannedTargetPrice?: string;
  readonly timeStopAt?: string;
  readonly positionOpenedAt?: string;
  readonly strategyKey?: string;
  readonly strategyVersion?: string;
};

/** Attach the bounded safety projection where the authenticated dashboard expects it. */
export function attachUnmanagedPositions<T extends object>(model: T, unmanagedPositions: readonly UnmanagedPosition[]): T & { readonly unmanagedPositions: readonly UnmanagedPosition[] } {
  return { ...model, unmanagedPositions };
}

export function attachActiveExitPositions<T extends object>(model: T, activeExitPositions: readonly ActiveExitPosition[]): T & { readonly activeExitPositions: readonly ActiveExitPosition[] } {
  return { ...model, activeExitPositions };
}

/** Attach bounded originating-order metadata to positions without changing broker truth. */
export function attachPositionMetadata<T extends { readonly positions: readonly Record<string, unknown>[] }>(model: T, metadata: readonly PositionMetadata[]): T {
  const byPosition = new Map(metadata.map((item) => [`${item.assetClass}:${item.symbol}`, item]));
  return {
    ...model,
    positions: model.positions.map((position) => {
      const assetClass = typeof position.assetClass === "string" ? position.assetClass : "";
      const symbol = typeof position.symbol === "string" ? position.symbol : "";
      const match = byPosition.get(`${assetClass}:${symbol}`);
      if (!match) return position;
      return {
        ...position,
        ...(match.entryPrice ? { entryPrice: match.entryPrice } : {}),
        ...(match.plannedStopPrice ? { plannedStopPrice: match.plannedStopPrice } : {}),
        ...(match.plannedTargetPrice ? { plannedTargetPrice: match.plannedTargetPrice } : {}),
        ...(match.timeStopAt ? { timeStopAt: match.timeStopAt } : {}),
        ...(match.positionOpenedAt ? { positionOpenedAt: match.positionOpenedAt } : {}),
        ...(match.strategyKey ? { strategyKey: match.strategyKey } : {}),
        ...(match.strategyVersion ? { strategyVersion: match.strategyVersion } : {}),
      };
    }),
  };
}
