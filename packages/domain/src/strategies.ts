import * as DecimalModule from "decimal.js";
import type { StrategyBar, StrategyEvaluationContext, StrategyPlugin, StrategySignalCandidate } from "./strategy.js";
import { computeMarketIndicatorSnapshot } from "./indicators.js";

interface DecimalValue {
  plus(value: DecimalValue | string | number): DecimalValue;
  minus(value: DecimalValue | string | number): DecimalValue;
  times(value: DecimalValue | string | number): DecimalValue;
  div(value: DecimalValue | string | number): DecimalValue;
  greaterThan(value: DecimalValue | string | number): boolean;
  greaterThanOrEqualTo(value: DecimalValue | string | number): boolean;
  lessThan(value: DecimalValue | string | number): boolean;
  isNegative(): boolean;
  toDecimalPlaces(decimalPlaces: number): DecimalValue;
  toFixed(decimalPlaces?: number): string;
}
interface DecimalConstructor { new (value: string | number): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;
const output = (value: DecimalValue) => value.toDecimalPlaces(8).toFixed(8);
const parse = (value: string, name: string) => {
  try {
    const parsed = new Decimal(value);
    if (parsed.isNegative()) throw new Error(`${name} must not be negative.`);
    return parsed;
  } catch { throw new Error(`${name} must be a non-negative decimal string.`); }
};
const sorted = (bars: readonly StrategyBar[]) => [...bars].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
const latestBySymbol = (bars: readonly StrategyBar[]) => {
  const grouped = new Map<string, StrategyBar[]>();
  for (const bar of sorted(bars)) grouped.set(bar.symbol, [...(grouped.get(bar.symbol) ?? []), bar]);
  return grouped;
};
const futureTime = (timestamp: string, holdingBars: number) => new Date(Date.parse(timestamp) + holdingBars * 60 * 60 * 1000).toISOString();
const candidate = (key: string, version: string, bar: StrategyBar, bars: readonly StrategyBar[], score: DecimalValue, stopPercent: string, targetPercent: string, holdingBars: number, rationale: string): StrategySignalCandidate => {
  const close = parse(bar.close, "close");
  const marketSnapshot = computeMarketIndicatorSnapshot({ bars, asOf: bar.timestamp });
  return {
    assetClass: "us_equity", expiresAt: futureTime(bar.timestamp, holdingBars), proposedEntryPrice: output(close),
    plannedExitPrice: output(close.times(new Decimal("1").plus(parse(targetPercent, "targetPercent")))),
    plannedStopPrice: output(close.times(new Decimal("1").minus(parse(stopPercent, "stopPercent")))), rationale,
    ...(marketSnapshot ? { marketSnapshot } : {}),
    score: output(score), signalTime: bar.timestamp, side: "long", strategyKey: key, strategyVersion: version,
    symbol: bar.symbol, timeStopAt: futureTime(bar.timestamp, holdingBars),
  };
};
const boundedInteger = (value: unknown, name: string, min: number, max: number): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  return value;
};
const common = (value: unknown, defaults: { readonly stopPercent: string; readonly targetPercent: string; readonly holdingBars: number }) => {
  if (!value || typeof value !== "object") throw new Error("Strategy parameters must be an object.");
  const candidateValue = value as Record<string, unknown>;
  const stopPercent = String(candidateValue.stopPercent ?? defaults.stopPercent);
  const targetPercent = String(candidateValue.targetPercent ?? defaults.targetPercent);
  parse(stopPercent, "stopPercent"); parse(targetPercent, "targetPercent");
  if (parse(stopPercent, "stopPercent").greaterThanOrEqualTo("1")) throw new Error("stopPercent must be below 1.");
  return { stopPercent, targetPercent, holdingBars: boundedInteger(candidateValue.holdingBars ?? defaults.holdingBars, "holdingBars", 1, 240) };
};

export interface CrossSectionalMomentumParameters { lookbackBars: number; maxCandidates: number; minReturn: string; stopPercent: string; targetPercent: string; holdingBars: number; }
export interface VolumeBreakoutParameters { rangeLookbackBars: number; volumeLookbackBars: number; volumeMultiplier: string; stopPercent: string; targetPercent: string; holdingBars: number; }
export interface TrendContinuationParameters { fastLookbackBars: number; slowLookbackBars: number; minTrendReturn: string; stopPercent: string; targetPercent: string; holdingBars: number; }

function crossSectionalEvaluate(context: StrategyEvaluationContext, parameters: CrossSectionalMomentumParameters) {
  const ranked: { bar: StrategyBar; returnValue: DecimalValue }[] = [];
  for (const bars of latestBySymbol(context.market.bars).values()) {
    if (bars.length <= parameters.lookbackBars) continue;
    const latest = bars[bars.length - 1]!; const prior = bars[bars.length - 1 - parameters.lookbackBars]!;
    const start = parse(prior.close, "close"); const end = parse(latest.close, "close");
    if (start.isNegative() || start.toFixed() === "0") continue;
    const returnValue = end.div(start).minus("1");
    if (returnValue.greaterThanOrEqualTo(parameters.minReturn)) ranked.push({ bar: latest, returnValue });
  }
  return ranked.sort((a, b) => (a.returnValue.greaterThan(b.returnValue) ? -1 : 1)).slice(0, parameters.maxCandidates)
    .map(({ bar, returnValue }) => candidate("cross-sectional-momentum", "1.0.0", bar, latestBySymbol(context.market.bars).get(bar.symbol) ?? [], returnValue, parameters.stopPercent, parameters.targetPercent, parameters.holdingBars, "Positive point-in-time return ranked across symbols."));
}

function breakoutEvaluate(context: StrategyEvaluationContext, parameters: VolumeBreakoutParameters) {
  const results: StrategySignalCandidate[] = [];
  for (const bars of latestBySymbol(context.market.bars).values()) {
    const required = Math.max(parameters.rangeLookbackBars, parameters.volumeLookbackBars);
    if (bars.length <= required) continue;
    const latest = bars[bars.length - 1]!; const prior = bars.slice(0, -1);
    const range = prior.slice(-parameters.rangeLookbackBars); const volumes = prior.slice(-parameters.volumeLookbackBars);
    const highest = range.reduce<DecimalValue | undefined>((max, bar) => {
      const high = parse(bar.high, "high");
      return max === undefined || high.greaterThan(max) ? high : max;
    }, undefined)!;
    const averageVolume = volumes.reduce((sum, bar) => sum.plus(parse(bar.volume, "volume")), new Decimal("0")).div(volumes.length);
    if (!parse(latest.close, "close").greaterThan(highest) || !parse(latest.volume, "volume").greaterThanOrEqualTo(averageVolume.times(parse(parameters.volumeMultiplier, "volumeMultiplier")))) continue;
    results.push(candidate("volume-confirmed-breakout", "1.0.0", latest, bars, parse(latest.close, "close").div(highest).minus("1"), parameters.stopPercent, parameters.targetPercent, parameters.holdingBars, "Point-in-time range breakout confirmed by relative volume."));
  }
  return results;
}

function trendEvaluate(context: StrategyEvaluationContext, parameters: TrendContinuationParameters) {
  const results: StrategySignalCandidate[] = [];
  for (const bars of latestBySymbol(context.market.bars).values()) {
    if (bars.length <= parameters.slowLookbackBars) continue;
    const latest = bars[bars.length - 1]!; const fastStart = bars[bars.length - 1 - parameters.fastLookbackBars]!; const slowStart = bars[bars.length - 1 - parameters.slowLookbackBars]!;
    const close = parse(latest.close, "close"); const fastReturn = close.div(parse(fastStart.close, "close")).minus("1"); const slowReturn = close.div(parse(slowStart.close, "close")).minus("1");
    if (fastReturn.greaterThanOrEqualTo(parameters.minTrendReturn) && slowReturn.greaterThanOrEqualTo(parameters.minTrendReturn)) results.push(candidate("intraday-trend-continuation", "1.0.0", latest, bars, fastReturn, parameters.stopPercent, parameters.targetPercent, parameters.holdingBars, "Fast and slow point-in-time trends agree."));
  }
  return results;
}

export const crossSectionalMomentum: StrategyPlugin<CrossSectionalMomentumParameters> = {
  assetClass: "us_equity", description: "Ranks symbols by point-in-time trailing return.", key: "cross-sectional-momentum", owner: "research", requiredLookbackBars: 20, stage: "disabled", version: "1.0.0",
  parameters: { defaults: { lookbackBars: 20, maxCandidates: 3, minReturn: "0.02", stopPercent: "0.02", targetPercent: "0.04", holdingBars: 24 }, validate: (value) => { const v = (value ?? {}) as Record<string, unknown>; const c = common(v, crossSectionalMomentum.parameters.defaults); return { ...c, lookbackBars: boundedInteger(v.lookbackBars ?? 20, "lookbackBars", 2, 252), maxCandidates: boundedInteger(v.maxCandidates ?? 3, "maxCandidates", 1, 10), minReturn: output(parse(String(v.minReturn ?? "0.02"), "minReturn")) }; } },
  evaluate: crossSectionalEvaluate,
};
export const volumeConfirmedBreakout: StrategyPlugin<VolumeBreakoutParameters> = {
  assetClass: "us_equity", description: "Finds range breakouts confirmed by relative volume.", key: "volume-confirmed-breakout", owner: "research", requiredLookbackBars: 20, stage: "disabled", version: "1.0.0",
  parameters: { defaults: { rangeLookbackBars: 20, volumeLookbackBars: 20, volumeMultiplier: "1.5", stopPercent: "0.02", targetPercent: "0.04", holdingBars: 8 }, validate: (value) => { const v = (value ?? {}) as Record<string, unknown>; const c = common(v, volumeConfirmedBreakout.parameters.defaults); const multiplier = parse(String(v.volumeMultiplier ?? "1.5"), "volumeMultiplier"); if (!multiplier.greaterThan("0")) throw new Error("volumeMultiplier must be positive."); return { ...c, rangeLookbackBars: boundedInteger(v.rangeLookbackBars ?? 20, "rangeLookbackBars", 2, 252), volumeLookbackBars: boundedInteger(v.volumeLookbackBars ?? 20, "volumeLookbackBars", 2, 252), volumeMultiplier: output(multiplier) }; } },
  evaluate: breakoutEvaluate,
};
export const intradayTrendContinuation: StrategyPlugin<TrendContinuationParameters> = {
  assetClass: "us_equity", description: "Continues aligned fast and slow intraday trends.", key: "intraday-trend-continuation", owner: "research", requiredLookbackBars: 20, stage: "disabled", version: "1.0.0",
  parameters: { defaults: { fastLookbackBars: 5, slowLookbackBars: 20, minTrendReturn: "0.01", stopPercent: "0.02", targetPercent: "0.04", holdingBars: 8 }, validate: (value) => { const v = (value ?? {}) as Record<string, unknown>; const c = common(v, intradayTrendContinuation.parameters.defaults); const fast = boundedInteger(v.fastLookbackBars ?? 5, "fastLookbackBars", 2, 50); const slow = boundedInteger(v.slowLookbackBars ?? 20, "slowLookbackBars", 3, 252); if (fast >= slow) throw new Error("fastLookbackBars must be less than slowLookbackBars."); return { ...c, fastLookbackBars: fast, slowLookbackBars: slow, minTrendReturn: output(parse(String(v.minTrendReturn ?? "0.01"), "minTrendReturn")) }; } },
  evaluate: trendEvaluate,
};

export const INITIAL_MOMENTUM_STRATEGIES = [crossSectionalMomentum, volumeConfirmedBreakout, intradayTrendContinuation] as const;
