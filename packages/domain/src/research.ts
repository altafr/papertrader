import { runHistoricalReplay, type ReplayResult } from "./replay.js";
import type { DecimalString } from "./metrics.js";
import type { StrategyPlugin, StrategyBar } from "./strategy.js";
import * as DecimalModule from "decimal.js";

interface DecimalValue { greaterThan(value: DecimalValue | string): boolean; toFixed(decimalPlaces?: number): string; }
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

export type MarketRegime = "bear" | "bull" | "choppy";

export interface RegimeReplayInput {
  readonly bars: readonly StrategyBar[];
  readonly name: string;
  readonly regime: MarketRegime;
}

export interface RegimeReplayResult {
  readonly name: string;
  readonly regime: MarketRegime;
  readonly replay: ReplayResult;
}

export interface ReplayEvidence {
  readonly strategyKey: string;
  readonly strategyVersion: string;
  readonly results: readonly RegimeReplayResult[];
}

export interface ReplayPromotionPolicy {
  readonly maxDrawdownPercent: DecimalString;
  readonly minimumPositiveRegimes: number;
  readonly minimumTrades: number;
}

export interface ReplayPromotionAssessment {
  readonly automatedChecksPass: boolean;
  readonly promotable: false;
  readonly reasons: readonly string[];
}

export function runRegimeReplay<Parameters extends object>(input: {
  readonly defaultNotional: DecimalString;
  readonly estimatedFeesPerTrade: DecimalString;
  readonly initialEquity: DecimalString;
  readonly parameters: Parameters;
  readonly regimes: readonly RegimeReplayInput[];
  readonly slippageBps: DecimalString;
  readonly strategy: StrategyPlugin<Parameters>;
}): ReplayEvidence {
  return {
    strategyKey: input.strategy.key,
    strategyVersion: input.strategy.version,
    results: input.regimes.map((regime) => ({
      name: regime.name,
      regime: regime.regime,
      replay: runHistoricalReplay({
        bars: regime.bars,
        defaultNotional: input.defaultNotional,
        estimatedFeesPerTrade: input.estimatedFeesPerTrade,
        initialEquity: input.initialEquity,
        parameters: input.parameters,
        slippageBps: input.slippageBps,
        strategy: input.strategy,
      }),
    })),
  };
}

export function assessReplayPromotion(evidence: ReplayEvidence, policy: ReplayPromotionPolicy): ReplayPromotionAssessment {
  const failures: string[] = [];
  const positiveRegimes = evidence.results.filter((result) => result.replay.metrics.totalPnl.startsWith("-") === false).length;
  const tradeCount = evidence.results.reduce((total, result) => total + result.replay.trades.length, 0);
  const maxDrawdown = evidence.results.reduce<DecimalValue>((maximum, result) => {
    const drawdown = new Decimal(result.replay.metrics.maxDrawdownPercent);
    return drawdown.greaterThan(maximum) ? drawdown : maximum;
  }, new Decimal("0"));
  if (tradeCount < policy.minimumTrades) failures.push(`minimum trade sample not met (${tradeCount} < ${policy.minimumTrades})`);
  if (positiveRegimes < policy.minimumPositiveRegimes) failures.push(`positive regime coverage not met (${positiveRegimes} < ${policy.minimumPositiveRegimes})`);
  if (maxDrawdown.greaterThan(policy.maxDrawdownPercent)) failures.push(`maximum drawdown exceeded (${maxDrawdown.toFixed(8)} > ${policy.maxDrawdownPercent})`);
  return { automatedChecksPass: failures.length === 0, promotable: false, reasons: [...failures, "manual review and paper-forward evidence are still required"] };
}
