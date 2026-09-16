import { isUsStockInTradingUniverse, TRADING_UNIVERSE_VERSION, US_STOCK_TRADING_UNIVERSE } from "./trading-universe.js";

export type UniverseRefreshProposal = {
  readonly agentType: "us_universe_refresh";
  readonly cadence: "quarterly";
  readonly currentVersion: string;
  readonly additions: readonly string[];
  readonly rationale: string;
  readonly requiresOperatorReview: true;
};

/** Build a bounded quarterly proposal. It never changes the active universe by itself. */
export function buildQuarterlyUniverseRefreshProposal(candidates: readonly string[], currentUniverse: readonly string[] = US_STOCK_TRADING_UNIVERSE): UniverseRefreshProposal {
  const additions = [...new Set(candidates.map((symbol) => symbol.trim().toUpperCase()))]
    .filter((symbol) => /^[A-Z][A-Z0-9._-]{0,9}$/.test(symbol))
    .filter((symbol) => !isUsStockInTradingUniverse(symbol, currentUniverse))
    .slice(0, 25);
  return {
    additions,
    agentType: "us_universe_refresh",
    cadence: "quarterly",
    currentVersion: TRADING_UNIVERSE_VERSION,
    rationale: "Quarterly liquidity, momentum, volatility, and tradability review. Additions remain pending until operator review; no order can use a pending symbol.",
    requiresOperatorReview: true,
  };
}
