import type { PaperMarketDataReader, MarketAssetClass, MarketBarTimeframe } from "@momentum/alpaca";
import type { ResearchAgentInput, StrategyAssetClass } from "@momentum/domain";

const allowedTimeframes: readonly MarketBarTimeframe[] = ["1Day", "1Hour", "1Min", "1Month", "1Week", "5Min", "15Min"];

export function createAlpacaResearchInputSource(reader: PaperMarketDataReader) {
  return {
    async read(input: {
      readonly assetClass: StrategyAssetClass;
      readonly end?: string;
      readonly limit: number;
      readonly maxCandidates: number;
      readonly start?: string;
      readonly symbols: readonly string[];
      readonly timeframe: MarketBarTimeframe;
    }): Promise<ResearchAgentInput> {
      if (input.symbols.length < 1 || input.symbols.length > 10) throw new Error("Research source supports 1 to 10 symbols.");
      if (!Number.isSafeInteger(input.limit) || input.limit < 2 || input.limit > 1_000) throw new Error("Research source limit must be an integer from 2 to 1000.");
      if (!Number.isSafeInteger(input.maxCandidates) || input.maxCandidates < 1 || input.maxCandidates > 20) throw new Error("Research source maxCandidates must be an integer from 1 to 20.");
      if (!allowedTimeframes.includes(input.timeframe)) throw new Error("Research source timeframe is not supported.");
      const result = await reader.readHistoricalBars({ assetClass: input.assetClass as MarketAssetClass, limit: input.limit, symbols: input.symbols, timeframe: input.timeframe, ...(input.end ? { end: input.end } : {}), ...(input.start ? { start: input.start } : {}) });
      return {
        assetClass: input.assetClass,
        bars: result.bars.map((bar) => ({ close: bar.close, high: bar.high, low: bar.low, open: bar.open, symbol: bar.symbol, timestamp: bar.timestamp, volume: bar.volume })),
        capturedAt: new Date().toISOString(),
        freshness: "fresh",
        maxCandidates: input.maxCandidates,
        source: "alpaca",
      };
    },
  };
}
