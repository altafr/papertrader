import * as DecimalModule from "decimal.js";

import { calculateTradeRisk, MAX_SINGLE_TRADE_STOP_LOSS_PERCENT, type DecimalString, type TradeRiskResult } from "./metrics.js";
import type { StrategySignalCandidate } from "./strategy.js";

interface DecimalValue {
  abs(): DecimalValue;
  div(value: DecimalValue | string): DecimalValue;
  greaterThan(value: DecimalValue | string): boolean;
  isNegative(): boolean;
  lessThan(value: DecimalValue | string): boolean;
  minus(value: DecimalValue | string): DecimalValue;
  plus(value: DecimalValue | string): DecimalValue;
  times(value: DecimalValue | string): DecimalValue;
  toDecimalPlaces(decimalPlaces: number): DecimalValue;
  toFixed(decimalPlaces?: number): string;
}
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

export interface ImmutablePaperSignal {
  readonly candidate: StrategySignalCandidate;
  readonly createdAt: string;
  readonly signalId: string;
}

export interface PaperRiskPosition {
  readonly assetClass: "crypto" | "us_equity";
  readonly marketValue: DecimalString;
}

export interface PaperRiskState {
  readonly accountBaselineVerified: boolean;
  readonly accountFresh: boolean;
  readonly dataFresh: boolean;
  readonly killSwitchActive: boolean;
  readonly openPositions: readonly PaperRiskPosition[];
  readonly submittedEntriesLast24Hours: number;
  /** Explicitly enabled only when restart-safe synthetic crypto protection is active. */
  readonly cryptoSyntheticBracketEnabled?: boolean;
  /** Symbols that cannot be automatically managed because their exit plan is incomplete. */
  readonly unmanagedPositions?: readonly string[];
}

export interface PaperRiskPolicy {
  readonly initialEquityBaseline: DecimalString;
  /** Minimum invested notional for every new trade as a percentage of equity. */
  readonly minPositionPercent: DecimalString;
  readonly maxCryptoPositionPercent: DecimalString;
  readonly maxGrossExposurePercent: DecimalString;
  readonly maxOpenPositions: number;
  readonly maxSubmittedEntriesLast24Hours: number;
  readonly maxStockPositionPercent: DecimalString;
}

/** Alpaca's default paper account starts at USD 100,000; verify this baseline before activation. */
export const PAPER_INITIAL_EQUITY_BASELINE = "100000";

export type PaperBaselineStatus = "above_baseline" | "below_baseline" | "unavailable" | "within_tolerance";

/** Redacted baseline classification for operator health; never returns an account value. */
export function classifyPaperBaseline(equity: string | number | undefined, baseline = PAPER_INITIAL_EQUITY_BASELINE, tolerance = "1"): PaperBaselineStatus {
  if (equity === undefined || equity === null || equity === "") return "unavailable";
  try {
    const value = new Decimal(String(equity));
    const expected = new Decimal(String(baseline));
    const allowed = new Decimal(String(tolerance));
    if (value.isNegative() || expected.isNegative() || allowed.isNegative()) return "unavailable";
    if (value.minus(expected).abs().lessThan(allowed) || value.minus(expected).abs().toFixed() === allowed.toFixed()) return "within_tolerance";
    return value.lessThan(expected) ? "below_baseline" : "above_baseline";
  } catch {
    return "unavailable";
  }
}

export const DEFAULT_PAPER_RISK_POLICY: PaperRiskPolicy = {
  initialEquityBaseline: PAPER_INITIAL_EQUITY_BASELINE,
  minPositionPercent: "2",
  maxCryptoPositionPercent: "3",
  maxGrossExposurePercent: "50",
  maxOpenPositions: 10,
  maxSubmittedEntriesLast24Hours: 20,
  maxStockPositionPercent: "5",
};

export interface PaperRiskAssessment {
  readonly estimatedLoss: DecimalString;
  readonly estimatedLossPercent: DecimalString;
  readonly passes: boolean;
  readonly reasons: readonly string[];
  readonly risk: TradeRiskResult;
}

function decimal(value: string, name: string): DecimalValue {
  try {
    const parsed = new Decimal(value);
    if (parsed.isNegative()) throw new Error(`${name} must not be negative.`);
    return parsed;
  } catch {
    throw new Error(`${name} must be a non-negative decimal string.`);
  }
}

export function createImmutablePaperSignal(input: { readonly candidate: StrategySignalCandidate; readonly createdAt: string; readonly signalId: string; }): ImmutablePaperSignal {
  if (!input.signalId.trim()) throw new Error("Paper signal ID is required.");
  if (!input.createdAt || Number.isNaN(Date.parse(input.createdAt)) || Number.isNaN(Date.parse(input.candidate.signalTime))) throw new Error("Paper signal timestamps must be valid.");
  if (Date.parse(input.createdAt) < Date.parse(input.candidate.signalTime)) throw new Error("Paper signal creation cannot precede the signal time.");
  if (input.candidate.side !== "long") throw new Error("Only long paper signals are supported.");
  return Object.freeze({ candidate: Object.freeze({ ...input.candidate }), createdAt: input.createdAt, signalId: input.signalId });
}

export function assessPaperRisk(input: {
  readonly estimatedFees: DecimalString;
  readonly estimatedSlippage: DecimalString;
  readonly equity: DecimalString;
  readonly policy?: PaperRiskPolicy;
  readonly quantity: DecimalString;
  readonly signal: ImmutablePaperSignal;
  readonly state: PaperRiskState;
}): PaperRiskAssessment {
  const policy = input.policy ?? DEFAULT_PAPER_RISK_POLICY;
  const equity = decimal(input.equity, "equity");
  const quantity = decimal(input.quantity, "quantity");
  if (equity.isNegative() || quantity.isNegative()) throw new Error("Risk values must be non-negative.");
  const candidate = input.signal.candidate;
  const entry = decimal(candidate.proposedEntryPrice, "entry price");
  const stop = decimal(candidate.plannedStopPrice, "planned stop price");
  if (entry.isNegative() || entry.toFixed() === "0") throw new Error("entry price must be greater than zero.");
  const risk = calculateTradeRisk({ entryPrice: candidate.proposedEntryPrice, equity: input.equity, estimatedFees: input.estimatedFees, estimatedSlippage: input.estimatedSlippage, quantity: input.quantity, stopPrice: candidate.plannedStopPrice });
  const reasons: string[] = [];
  const adverseStopPercent = entry.minus(stop).div(entry).times("100");
  if (adverseStopPercent.greaterThan(MAX_SINGLE_TRADE_STOP_LOSS_PERCENT)) reasons.push("Planned stop exceeds the maximum 5% adverse-loss distance.");
  if (!input.state.accountBaselineVerified) reasons.push("Starting paper-equity baseline has not been verified.");
  if (!input.state.accountFresh) reasons.push("Account state is stale.");
  if (!input.state.dataFresh) reasons.push("Market data is stale.");
  if (input.state.killSwitchActive) reasons.push("Global kill switch is active.");
  if ((input.state.unmanagedPositions?.length ?? 0) > 0) reasons.push("Existing positions lack complete exit plans; new entries are paused until portfolio coverage is restored.");
  if (input.state.submittedEntriesLast24Hours >= policy.maxSubmittedEntriesLast24Hours) reasons.push("Rolling 24-hour entry limit has been reached.");
  if (input.state.openPositions.length >= policy.maxOpenPositions) reasons.push("Maximum open-position limit has been reached.");
  if (candidate.assetClass === "crypto" && input.state.cryptoSyntheticBracketEnabled !== true) reasons.push("Alpaca crypto entries require a bracket-capable adapter; entry rejected until synthetic bracket protection is enabled.");
  if (!risk.passes) reasons.push("Estimated planned-stop loss exceeds 5% of invested notional.");
  const notional = entry.times(quantity);
  if (notional.lessThan(equity.times(policy.minPositionPercent).div("100"))) {
    reasons.push(`Proposed position is below the minimum ${policy.minPositionPercent}% of portfolio investment.`);
  }
  const maxPositionPercent = candidate.assetClass === "crypto" ? policy.maxCryptoPositionPercent : policy.maxStockPositionPercent;
  if (notional.greaterThan(equity.times(maxPositionPercent).div("100"))) {
    reasons.push("Proposed position exceeds the asset-class position cap.");
  }
  const grossExposure = input.state.openPositions.reduce((total, position) => total.plus(decimal(position.marketValue, "position market value").abs()), new Decimal("0")).plus(notional);
  if (grossExposure.greaterThan(equity.times(policy.maxGrossExposurePercent).div("100"))) reasons.push("Proposed position exceeds the gross-exposure cap.");
  return { estimatedLoss: risk.estimatedLoss, estimatedLossPercent: risk.estimatedLossPercent, passes: reasons.length === 0, reasons, risk };
}
