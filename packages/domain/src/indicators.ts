import * as DecimalModule from "decimal.js";

import type { StrategyBar } from "./strategy.js";

/** Point-in-time, displayable indicators captured from finalized bars. */
export interface MarketIndicatorSnapshot {
  readonly asOf: string;
  readonly close: string;
  readonly volume: string;
  readonly ema20: string | null;
  readonly ema50: string | null;
  readonly rsi14: string | null;
  readonly atr14: string | null;
  readonly relativeVolume20: string | null;
}

interface DecimalValue {
  abs(): DecimalValue;
  div(value: DecimalValue | number): DecimalValue;
  greaterThan(value: DecimalValue | number): boolean;
  isNegative(): boolean;
  isPositive(): boolean;
  isZero(): boolean;
  minus(value: DecimalValue | number): DecimalValue;
  plus(value: DecimalValue | number): DecimalValue;
  times(value: DecimalValue | number): DecimalValue;
  toDecimalPlaces(decimalPlaces: number): DecimalValue;
  toFixed(decimalPlaces?: number): string;
}
interface DecimalConstructor { new (value: string | number): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

const fixed = (value: DecimalValue) => value.toDecimalPlaces(8).toFixed(8);
const ordered = (bars: readonly StrategyBar[]) => [...bars].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

function ema(values: readonly DecimalValue[], period: number): DecimalValue | undefined {
  if (values.length < period) return undefined;
  let current = values.slice(0, period).reduce((sum, value) => sum.plus(value), new Decimal(0)).div(period);
  const multiplier = new Decimal(2).div(period + 1);
  for (const value of values.slice(period)) current = value.minus(current).times(multiplier).plus(current);
  return current;
}

function rsi(values: readonly DecimalValue[], period: number): DecimalValue | undefined {
  if (values.length <= period) return undefined;
  let gains = new Decimal(0);
  let losses = new Decimal(0);
  for (let index = 1; index <= period; index += 1) {
    const change = values[index]!.minus(values[index - 1]!);
    if (change.isPositive()) gains = gains.plus(change); else losses = losses.plus(change.abs());
  }
  let averageGain = gains.div(period);
  let averageLoss = losses.div(period);
  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index]!.minus(values[index - 1]!);
    averageGain = (averageGain.times(period - 1).plus(change.isPositive() ? change : 0)).div(period);
    averageLoss = (averageLoss.times(period - 1).plus(change.isNegative() ? change.abs() : 0)).div(period);
  }
  if (averageLoss.isZero()) return new Decimal(100);
  return new Decimal(100).minus(new Decimal(100).div(new Decimal(1).plus(averageGain.div(averageLoss))));
}

function atr(bars: readonly StrategyBar[], period: number): DecimalValue | undefined {
  if (bars.length <= period) return undefined;
  const trueRanges: DecimalValue[] = [];
  for (let index = 1; index < bars.length; index += 1) {
    const bar = bars[index]!;
    const previousClose = new Decimal(bars[index - 1]!.close);
    const high = new Decimal(bar.high);
    const low = new Decimal(bar.low);
    const range = high.minus(low);
    const highGap = high.minus(previousClose).abs();
    const lowGap = low.minus(previousClose).abs();
    trueRanges.push(range.greaterThan(highGap) ? (range.greaterThan(lowGap) ? range : lowGap) : (highGap.greaterThan(lowGap) ? highGap : lowGap));
  }
  if (trueRanges.length < period) return undefined;
  let current = trueRanges.slice(0, period).reduce((sum, value) => sum.plus(value), new Decimal(0)).div(period);
  for (const value of trueRanges.slice(period)) current = current.times(period - 1).plus(value).div(period);
  return current;
}

export function computeMarketIndicatorSnapshot(input: { readonly bars: readonly StrategyBar[]; readonly asOf?: string }): MarketIndicatorSnapshot | undefined {
  const bars = ordered(input.bars);
  const latest = bars.at(-1);
  if (!latest) return undefined;
  const closes = bars.map((bar) => new Decimal(bar.close));
  const volumes = bars.map((bar) => new Decimal(bar.volume));
  const averageVolume = volumes.length >= 20 ? volumes.slice(-20).reduce((sum, value) => sum.plus(value), new Decimal(0)).div(20) : undefined;
  const latestVolume = volumes.at(-1)!;
  return {
    asOf: input.asOf ?? latest.timestamp,
    close: fixed(closes.at(-1)!),
    volume: fixed(latestVolume),
    ema20: ema(closes, 20) ? fixed(ema(closes, 20)!) : null,
    ema50: ema(closes, 50) ? fixed(ema(closes, 50)!) : null,
    rsi14: rsi(closes, 14) ? fixed(rsi(closes, 14)!) : null,
    atr14: atr(bars, 14) ? fixed(atr(bars, 14)!) : null,
    relativeVolume20: averageVolume && !averageVolume.isZero() ? fixed(latestVolume.div(averageVolume)) : null,
  };
}
