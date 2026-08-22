import * as DecimalModule from "decimal.js";

type DecimalInput = DecimalValue | number | string;

interface DecimalValue {
  abs(): DecimalValue;
  div(value: DecimalInput): DecimalValue;
  greaterThan(value: DecimalInput): boolean;
  isNegative(): boolean;
  isZero(): boolean;
  lessThanOrEqualTo(value: DecimalInput): boolean;
  minus(value: DecimalInput): DecimalValue;
  plus(value: DecimalInput): DecimalValue;
  times(value: DecimalInput): DecimalValue;
  toDecimalPlaces(decimalPlaces: number): DecimalValue;
  toFixed(decimalPlaces?: number): string;
}

interface DecimalConstructor {
  new (value: string | number): DecimalValue;
}

const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

export type DecimalString = string;

const ABSOLUTE_TRADE_RISK_LIMIT = new Decimal("100");
const PERCENT_TRADE_RISK_LIMIT = new Decimal("0.0025");

function decimal(value: DecimalString): DecimalValue {
  try {
    return new Decimal(value);
  } catch {
    throw new Error("Financial metric inputs must be valid decimal strings.");
  }
}

function output(value: DecimalValue): DecimalString {
  return value.toDecimalPlaces(8).toFixed(8);
}

function nonNegative(value: DecimalString, name: string): DecimalValue {
  const parsed = decimal(value);
  if (parsed.isNegative()) throw new Error(`${name} must not be negative.`);
  return parsed;
}

export interface PerformancePoint {
  readonly capturedAt: string;
  readonly equity: DecimalString;
}

export interface PerformanceMetrics {
  readonly finalEquity: DecimalString;
  readonly initialEquity: DecimalString;
  readonly maxDrawdownAmount: DecimalString;
  readonly maxDrawdownPercent: DecimalString;
  readonly totalPnl: DecimalString;
  readonly totalReturnPercent: DecimalString;
}

export function calculatePerformanceMetrics(points: readonly PerformancePoint[]): PerformanceMetrics {
  if (points.length === 0) throw new Error("At least one performance point is required.");
  const initial = nonNegative(points[0]?.equity ?? "", "initial equity");
  let peak = initial;
  let maxDrawdown = new Decimal(0);
  let maxDrawdownPercent = new Decimal(0);
  for (const point of points) {
    const equity = nonNegative(point.equity, "equity");
    if (equity.greaterThan(peak)) peak = equity;
    const drawdown = peak.minus(equity);
    if (drawdown.greaterThan(maxDrawdown)) maxDrawdown = drawdown;
    if (!peak.isZero()) {
      const drawdownPercent = drawdown.div(peak).times(100);
      if (drawdownPercent.greaterThan(maxDrawdownPercent)) maxDrawdownPercent = drawdownPercent;
    }
  }
  const finalEquity = nonNegative(points[points.length - 1]?.equity ?? "", "final equity");
  const totalPnl = finalEquity.minus(initial);
  const totalReturnPercent = initial.isZero() ? new Decimal(0) : totalPnl.div(initial).times(100);
  return {
    finalEquity: output(finalEquity),
    initialEquity: output(initial),
    maxDrawdownAmount: output(maxDrawdown),
    maxDrawdownPercent: output(maxDrawdownPercent),
    totalPnl: output(totalPnl),
    totalReturnPercent: output(totalReturnPercent),
  };
}

export interface ExposurePosition {
  readonly marketValue: DecimalString;
}

export interface ExposureMetrics {
  readonly grossExposure: DecimalString;
  readonly grossExposurePercent: DecimalString;
}

export function calculateExposure(positions: readonly ExposurePosition[], equity: DecimalString): ExposureMetrics {
  const accountEquity = nonNegative(equity, "equity");
  const grossExposure = positions.reduce(
    (total, position) => total.plus(decimal(position.marketValue).abs()),
    new Decimal(0),
  );
  return {
    grossExposure: output(grossExposure),
    grossExposurePercent: output(accountEquity.isZero() ? new Decimal(0) : grossExposure.div(accountEquity).times(100)),
  };
}

export interface TradeRiskInput {
  readonly entryPrice: DecimalString;
  readonly equity: DecimalString;
  readonly estimatedFees: DecimalString;
  readonly estimatedSlippage: DecimalString;
  readonly quantity: DecimalString;
  readonly stopPrice: DecimalString;
}

export interface TradeRiskResult {
  readonly allowedRisk: DecimalString;
  readonly estimatedLoss: DecimalString;
  readonly estimatedLossPercent: DecimalString;
  readonly maximumRiskByEquity: DecimalString;
  readonly maximumRiskAbsolute: DecimalString;
  readonly passes: boolean;
}

export function calculateTradeRisk(input: TradeRiskInput): TradeRiskResult {
  const equity = nonNegative(input.equity, "equity");
  const quantity = nonNegative(input.quantity, "quantity");
  const fees = nonNegative(input.estimatedFees, "estimated fees");
  const slippage = nonNegative(input.estimatedSlippage, "estimated slippage");
  const entry = nonNegative(input.entryPrice, "entry price");
  const stop = nonNegative(input.stopPrice, "stop price");
  const maximumRiskByEquity = equity.times(PERCENT_TRADE_RISK_LIMIT);
  const allowedRisk = maximumRiskByEquity.lessThanOrEqualTo(ABSOLUTE_TRADE_RISK_LIMIT)
    ? maximumRiskByEquity
    : ABSOLUTE_TRADE_RISK_LIMIT;
  const estimatedLoss = entry.minus(stop).abs().times(quantity).plus(fees).plus(slippage);
  return {
    allowedRisk: output(allowedRisk),
    estimatedLoss: output(estimatedLoss),
    estimatedLossPercent: output(equity.isZero() ? new Decimal(0) : estimatedLoss.div(equity).times(100)),
    maximumRiskAbsolute: output(ABSOLUTE_TRADE_RISK_LIMIT),
    maximumRiskByEquity: output(maximumRiskByEquity),
    passes: estimatedLoss.lessThanOrEqualTo(allowedRisk),
  };
}
