import * as DecimalModule from "decimal.js";

import { approvePaperTradeIntent, classifyPaperBaseline, createImmutablePaperSignal, createImmutablePaperTradeIntent, type PaperTradeApproval, type PaperRiskState, type ResearchWatchlistCandidate } from "@momentum/domain";

interface DecimalValue {
  greaterThan(value: DecimalValue | string): boolean;
  isNegative(): boolean;
  isZero(): boolean;
  times(value: DecimalValue | string): DecimalValue;
  toDecimalPlaces(decimalPlaces: number): DecimalValue;
  toFixed(decimalPlaces?: number): string;
}
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

export function isPaperBaselineVerified(equity: string | number | undefined, baseline = 100_000, tolerance = 1): boolean {
  return classifyPaperBaseline(equity, String(baseline), String(tolerance)) === "within_tolerance";
}

export type RiskCandidate = ResearchWatchlistCandidate & { readonly expiresAt: string; readonly plannedExitPrice: string; readonly plannedStopPrice: string; readonly proposedEntryPrice: string; readonly rationale: string; readonly score: string; readonly signalTime: string; readonly side: "long"; readonly strategyKey: string; readonly strategyVersion: string; readonly timeStopAt?: string };

export function buildRiskCandidate(input: ResearchWatchlistCandidate, now = new Date()): RiskCandidate {
  let close: DecimalValue;
  try { close = new Decimal(input.marketSnapshot?.close ?? ""); } catch { throw new Error("Research candidate must include a positive point-in-time close."); }
  if (close.isNegative() || close.isZero()) throw new Error("Research candidate must include a positive point-in-time close.");
  const signalTime = input.dataAsOf;
  if (Number.isNaN(Date.parse(signalTime)) || Date.parse(signalTime) > now.getTime()) throw new Error("Research candidate data timestamp is invalid or from the future.");
  // A delayed/restarted cycle can evaluate a still-valid historical bar
  // after its nominal one-day horizon. Never manufacture an intent that is
  // already expired at creation; retain the signal horizon when it is still
  // future, otherwise give the deterministic risk engine a bounded hour to
  // evaluate it.
  const signalExpiry = Date.parse(signalTime) + 86_400_000;
  const minimumFutureExpiry = now.getTime() + 3_600_000;
  return {
    ...input,
    expiresAt: new Date(Math.max(signalExpiry, minimumFutureExpiry)).toISOString(),
    plannedExitPrice: close.times("1.04").toDecimalPlaces(8).toFixed(8),
    // Keep the planned stop strictly inside the 5% maximum. Using 95% and
    // then rounding can produce a tiny over-limit distance for some prices,
    // causing every generated research candidate to fail closed.
    plannedStopPrice: close.times("0.9501").toDecimalPlaces(8).toFixed(8),
    proposedEntryPrice: close.toDecimalPlaces(8).toFixed(8),
    rationale: "Research candidate passed to the deterministic paper-risk engine for a non-submitting dry run.",
    score: input.momentumReturn,
    signalTime,
    side: "long",
    strategyKey: "research-watchlist",
    strategyVersion: "1.0.0",
  };
}

export function assessResearchCandidateRisk(input: { readonly candidate: ResearchWatchlistCandidate; readonly currentAt?: string; readonly equity: string; readonly quantity: string; readonly state: PaperRiskState }): { readonly approval: PaperTradeApproval; readonly intentId: string } {
  const currentAt = input.currentAt ?? new Date().toISOString();
  const candidate = buildRiskCandidate(input.candidate, new Date(currentAt));
  const signal = createImmutablePaperSignal({ candidate, createdAt: currentAt, signalId: `signal:${candidate.symbol}:${candidate.dataAsOf}` });
  // Alpaca client-order IDs permit only a bounded identifier alphabet; keep
  // the original symbol in the signal/order while making slash-delimited
  // crypto pairs safe for the derived idempotency key.
  const safeSymbol = candidate.symbol.replace(/[^A-Za-z0-9._:-]/g, "_");
  const intent = createImmutablePaperTradeIntent({ createdAt: currentAt, estimatedFees: "0", estimatedSlippage: "0", intentId: `intent:${safeSymbol}:${candidate.dataAsOf}`, quantity: input.quantity, signal });
  return { approval: approvePaperTradeIntent({ approvedAt: currentAt, currentAt, equity: input.equity, intent, state: input.state }), intentId: intent.intentId };
}
