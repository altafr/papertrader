export type UnmanagedPosition = { readonly assetClass: string; readonly symbol: string };

/** Attach the bounded safety projection where the authenticated dashboard expects it. */
export function attachUnmanagedPositions<T extends object>(model: T, unmanagedPositions: readonly UnmanagedPosition[]): T & { readonly unmanagedPositions: readonly UnmanagedPosition[] } {
  return { ...model, unmanagedPositions };
}
