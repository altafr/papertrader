import { addDecimalStrings, calculatePerformanceMetrics, calculateRoundTripPnl, type DecimalString, type PerformanceMetrics } from "./metrics.js";
import type { StrategyBar, StrategyEvaluationContext, StrategyPlugin } from "./strategy.js";

export interface ReplayOptions<Parameters extends object> {
  readonly bars: readonly StrategyBar[];
  readonly estimatedFeesPerTrade: DecimalString;
  readonly initialEquity: DecimalString;
  readonly parameters: Parameters;
  readonly slippageBps: DecimalString;
  readonly strategy: StrategyPlugin<Parameters>;
  /** Research-only notional used when a proposal intentionally has no sizing authority. */
  readonly defaultNotional?: DecimalString;
}

export interface ReplayTrade {
  readonly entryPrice: DecimalString;
  readonly exitPrice: DecimalString;
  readonly fees: DecimalString;
  readonly grossPnl: DecimalString;
  readonly netPnl: DecimalString;
  readonly signalTime: string;
  readonly slippage: DecimalString;
  readonly symbol: string;
}

export interface ReplayResult {
  readonly evaluatedBars: number;
  readonly metrics: PerformanceMetrics;
  readonly skippedSignals: number;
  readonly trades: readonly ReplayTrade[];
}

function sortedBars(bars: readonly StrategyBar[]): readonly StrategyBar[] {
  return [...bars].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

function nextBarForSymbol(bars: readonly StrategyBar[], index: number, symbol: string): StrategyBar | undefined {
  for (let candidate = index + 1; candidate < bars.length; candidate += 1) {
    if (bars[candidate]?.symbol === symbol) return bars[candidate];
  }
  return undefined;
}

export function runHistoricalReplay<Parameters extends object>(options: ReplayOptions<Parameters>): ReplayResult {
  if (options.strategy.stage !== "disabled" && options.strategy.stage !== "replay") {
    throw new Error("Only disabled or replay-stage strategies may run in historical replay.");
  }
  const parameters = options.strategy.parameters.validate(options.parameters);
  const bars = sortedBars(options.bars);
  if (bars.length === 0) throw new Error("Historical replay requires at least one bar.");
  const trades: ReplayTrade[] = [];
  const equityPoints = [{ capturedAt: bars[0]?.timestamp ?? "", equity: options.initialEquity }];
  let equity = options.initialEquity;
  let skippedSignals = 0;

  bars.forEach((bar, index) => {
    const context: StrategyEvaluationContext = {
      asOf: bar.timestamp,
      market: {
        bars: bars.filter((candidate) => candidate.timestamp <= bar.timestamp),
        capturedAt: bar.timestamp,
        freshness: "fresh",
        source: "alpaca",
      },
      positions: [],
    };
    const candidates = options.strategy.evaluate(context, parameters);
    for (const candidate of candidates) {
      const nextBar = nextBarForSymbol(bars, index, candidate.symbol);
      if (!nextBar || !candidate.plannedExitPrice || (!candidate.recommendedNotional && !options.defaultNotional)) {
        skippedSignals += 1;
        continue;
      }
      const entryPrice = nextBar.open;
      const pnl = calculateRoundTripPnl({
        entryPrice,
        estimatedFees: options.estimatedFeesPerTrade,
        exitPrice: candidate.plannedExitPrice,
        notional: candidate.recommendedNotional ?? options.defaultNotional!,
        slippageBps: options.slippageBps,
      });
      equity = addDecimalStrings(equity, pnl.netPnl);
      trades.push({
        entryPrice,
        exitPrice: candidate.plannedExitPrice,
        fees: pnl.fees,
        grossPnl: pnl.grossPnl,
        netPnl: pnl.netPnl,
        signalTime: candidate.signalTime,
        slippage: pnl.slippage,
        symbol: candidate.symbol,
      });
      equityPoints.push({ capturedAt: nextBar.timestamp, equity });
    }
  });

  return {
    evaluatedBars: bars.length,
    metrics: calculatePerformanceMetrics(equityPoints),
    skippedSignals,
    trades,
  };
}
