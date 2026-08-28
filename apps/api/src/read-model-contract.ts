export type UnmanagedPosition = { readonly assetClass: string; readonly symbol: string };
export type ActiveExitPosition = UnmanagedPosition;

/** Attach the bounded safety projection where the authenticated dashboard expects it. */
export function attachUnmanagedPositions<T extends object>(model: T, unmanagedPositions: readonly UnmanagedPosition[]): T & { readonly unmanagedPositions: readonly UnmanagedPosition[] } {
  return { ...model, unmanagedPositions };
}

export function attachActiveExitPositions<T extends object>(model: T, activeExitPositions: readonly ActiveExitPosition[]): T & { readonly activeExitPositions: readonly ActiveExitPosition[] } {
  return { ...model, activeExitPositions };
}
