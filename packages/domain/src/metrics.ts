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

/** Maximum planned loss as a percentage of the position's invested notional. */
export const MAX_SINGLE_TRADE_RISK_PERCENT_OF_NOTIONAL = "5";
/** Maximum adverse entry-to-stop distance for a long position. */
export const MAX_SINGLE_TRADE_STOP_LOSS_PERCENT = "5";

const NOTIONAL_TRADE_RISK_LIMIT = new Decimal("0.05");

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

export function addDecimalStrings(left: DecimalString, right: DecimalString): DecimalString {
  return output(decimal(left).plus(decimal(right)));
}

export function subtractDecimalStrings(left: DecimalString, right: DecimalString): DecimalString {
  return output(decimal(left).minus(decimal(right)));
}

export function formatDecimalString(value: DecimalString, decimalPlaces = 2): string {
  if (!Number.isSafeInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 20) throw new Error("decimalPlaces must be an integer from 0 to 20.");
  return decimal(value).toDecimalPlaces(decimalPlaces).toFixed(decimalPlaces);
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
  readonly investedNotional: DecimalString;
  readonly maximumRiskByNotional: DecimalString;
  readonly passes: boolean;
}

export interface RoundTripPnlInput {
  readonly entryPrice: DecimalString;
  readonly estimatedFees: DecimalString;
  readonly notional: DecimalString;
  readonly exitPrice: DecimalString;
  readonly slippageBps: DecimalString;
}

export interface RoundTripPnlResult {
  readonly fees: DecimalString;
  readonly grossPnl: DecimalString;
  readonly netPnl: DecimalString;
  readonly slippage: DecimalString;
}

export function calculateRoundTripPnl(input: RoundTripPnlInput): RoundTripPnlResult {
  const entry = nonNegative(input.entryPrice, "entry price");
  const exit = nonNegative(input.exitPrice, "exit price");
  const notional = nonNegative(input.notional, "notional");
  const fees = nonNegative(input.estimatedFees, "estimated fees");
  const slippageBps = nonNegative(input.slippageBps, "slippage basis points");
  if (entry.isZero()) throw new Error("entry price must be greater than zero.");
  const grossPnl = notional.times(exit.minus(entry)).div(entry);
  const slippage = notional.times(slippageBps).div(10_000).times(2);
  return {
    fees: output(fees),
    grossPnl: output(grossPnl),
    netPnl: output(grossPnl.minus(fees).minus(slippage)),
    slippage: output(slippage),
  };
}

export function calculateTradeRisk(input: TradeRiskInput): TradeRiskResult {
  nonNegative(input.equity, "equity");
  const quantity = nonNegative(input.quantity, "quantity");
  const fees = nonNegative(input.estimatedFees, "estimated fees");
  const slippage = nonNegative(input.estimatedSlippage, "estimated slippage");
  const entry = nonNegative(input.entryPrice, "entry price");
  const stop = nonNegative(input.stopPrice, "stop price");
  const investedNotional = entry.times(quantity);
  const maximumRiskByNotional = investedNotional.times(NOTIONAL_TRADE_RISK_LIMIT);
  const allowedRisk = maximumRiskByNotional;
  const estimatedLoss = entry.minus(stop).abs().times(quantity).plus(fees).plus(slippage);
  return {
    allowedRisk: output(allowedRisk),
    estimatedLoss: output(estimatedLoss),
    // The risk policy is defined against the capital invested in this trade,
    // not the account's total equity. Keep the reported percentage aligned
    // with `passes` and `maximumRiskByNotional`.
    estimatedLossPercent: output(investedNotional.isZero() ? new Decimal(0) : estimatedLoss.div(investedNotional).times(100)),
    investedNotional: output(investedNotional),
    maximumRiskByNotional: output(maximumRiskByNotional),
    passes: estimatedLoss.lessThanOrEqualTo(allowedRisk),
  };
}
