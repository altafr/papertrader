import * as DecimalModule from "decimal.js";

import type { PaperMarketDataReader, MarketAssetClass, MarketBarTimeframe } from "@momentum/alpaca";
import type { ResearchAgentInput, StrategyAssetClass } from "@momentum/domain";

interface BarDecimal { greaterThan(value: BarDecimal | string): boolean; isNegative(): boolean; isZero(): boolean; lessThan(value: BarDecimal | string): boolean; }
interface BarDecimalConstructor { new (value: string): BarDecimal; }
const BarDecimal = (DecimalModule as unknown as { readonly default: BarDecimalConstructor }).default;

const allowedTimeframes: readonly MarketBarTimeframe[] = ["1Day", "1Hour", "1Min", "1Month", "1Week", "5Min", "15Min"];

function positiveDecimal(value: string, label: string): BarDecimal {
  let parsed: BarDecimal;
  try { parsed = new BarDecimal(value); } catch { throw new Error(`${label} must be a positive number.`); }
  if (parsed.isNegative() || parsed.isZero()) throw new Error(`${label} must be a positive number.`);
  return parsed;
}

export function validateResearchBars(input: {
  readonly bars: readonly { readonly close: string; readonly high: string; readonly low: string; readonly open: string; readonly symbol: string; readonly timestamp: string; readonly volume: string }[];
  readonly now: Date;
  readonly symbols: readonly string[];
}): void {
  if (input.bars.length < 2) throw new Error("Research source returned fewer than 2 bars.");
  const requested = new Set(input.symbols);
  const latestBySymbol = new Map<string, number>();
  for (const bar of input.bars) {
    if (!requested.has(bar.symbol)) throw new Error("Research source returned an unrequested symbol.");
    const timestamp = Date.parse(bar.timestamp);
    if (Number.isNaN(timestamp)) throw new Error("Research source returned an invalid bar timestamp.");
    if (timestamp > input.now.getTime() + 5 * 60 * 1_000) throw new Error("Research source returned a future bar.");
    const previous = latestBySymbol.get(bar.symbol);
    if (previous !== undefined && timestamp === previous) throw new Error("Research source returned duplicate bars.");
    if (previous !== undefined && timestamp < previous) throw new Error("Research source returned out-of-order bars.");
    latestBySymbol.set(bar.symbol, timestamp);
    const open = positiveDecimal(bar.open, "open");
    const high = positiveDecimal(bar.high, "high");
    const low = positiveDecimal(bar.low, "low");
    const close = positiveDecimal(bar.close, "close");
    positiveDecimal(bar.volume, "volume");
    const maxBody = open.greaterThan(close) ? open : close;
    const minBody = open.lessThan(close) ? open : close;
    if (high.lessThan(maxBody) || low.greaterThan(minBody) || high.lessThan(low)) throw new Error("Research source returned inconsistent OHLC values.");
  }
}

export function createAlpacaResearchInputSource(reader: PaperMarketDataReader, clock: () => Date = () => new Date(), sleep: (delayMs: number) => Promise<void> = (delayMs) => new Promise((resolve) => { const timer = setTimeout(resolve, delayMs); timer.unref?.(); })) {
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
      const request = { assetClass: input.assetClass as MarketAssetClass, limit: input.limit, symbols: input.symbols, timeframe: input.timeframe, ...(input.end ? { end: input.end } : {}), ...(input.start ? { start: input.start } : {}) };
      let result: Awaited<ReturnType<PaperMarketDataReader["readHistoricalBars"]>> | undefined;
      let lastError: unknown;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          result = await reader.readHistoricalBars(request);
          if (result.bars.length >= 2) break;
          lastError = new Error("Research source returned fewer than 2 bars.");
        } catch (error: unknown) {
          lastError = error;
        }
        if (attempt < 2) await sleep(500);
      }
      if (!result || result.bars.length < 2) throw lastError instanceof Error ? lastError : new Error("Research source returned fewer than 2 bars.");
      const capturedAt = clock();
      validateResearchBars({ bars: result.bars, now: capturedAt, symbols: input.symbols });
      return {
        assetClass: input.assetClass,
        bars: result.bars.map((bar) => ({ close: bar.close, high: bar.high, low: bar.low, open: bar.open, symbol: bar.symbol, timestamp: bar.timestamp, volume: bar.volume })),
        capturedAt: capturedAt.toISOString(),
        freshness: "fresh",
        maxCandidates: input.maxCandidates,
        source: "alpaca",
      };
    },
  };
}
