/**
 * Versioned, paper-only US equity universe imported from the operator's
 * swing_trading_watchlist.xlsx workbook. Workbook notes are data, not code.
 */
export const TRADING_UNIVERSE_VERSION = "watchlist-2026-09-16";
export const CORE_MOMENTUM_SYMBOLS = Object.freeze([
  "NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AMD", "AVGO", "INTC", "PLTR", "CRWD", "SMCI", "COIN", "MARA", "JPM", "BAC", "AAL", "NU", "PATH", "NOK", "NFLX", "PLUG",
]);
export const HIGH_VOLATILITY_SYMBOLS = Object.freeze([
  "MSTR", "RIOT", "CLSK", "IONQ", "RGTI", "QBTS", "SOUN", "RKLB", "ASTS", "JOBY", "IREN", "CRWV", "OKLO",
]);
export const US_STOCK_TRADING_UNIVERSE = Object.freeze([...CORE_MOMENTUM_SYMBOLS, ...HIGH_VOLATILITY_SYMBOLS]);

export function getDefaultUsStockUniverse(): readonly string[] {
  return US_STOCK_TRADING_UNIVERSE;
}

export function isUsStockInTradingUniverse(symbol: string, universe: readonly string[] = US_STOCK_TRADING_UNIVERSE): boolean {
  return universe.includes(symbol.trim().toUpperCase());
}
