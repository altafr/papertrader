import { approvePaperTradeIntent, createImmutablePaperSignal, createImmutablePaperTradeIntent, type PaperTradeApproval, type PaperRiskState, type ResearchWatchlistCandidate } from "@momentum/domain";

export function isPaperBaselineVerified(equity: string | number | undefined, baseline = 100_000, tolerance = 1): boolean {
  const value = typeof equity === "number" ? equity : Number(equity);
  return Number.isFinite(value) && Math.abs(value - baseline) <= tolerance;
}

export type RiskCandidate = ResearchWatchlistCandidate & { readonly expiresAt: string; readonly plannedExitPrice: string; readonly plannedStopPrice: string; readonly proposedEntryPrice: string; readonly rationale: string; readonly score: string; readonly signalTime: string; readonly side: "long"; readonly strategyKey: string; readonly strategyVersion: string };

export function buildRiskCandidate(input: ResearchWatchlistCandidate, now = new Date()): RiskCandidate {
  const close = Number(input.marketSnapshot?.close ?? "NaN");
  if (!Number.isFinite(close) || close <= 0) throw new Error("Research candidate must include a positive point-in-time close.");
  const signalTime = input.dataAsOf;
  if (Number.isNaN(Date.parse(signalTime)) || Date.parse(signalTime) > now.getTime()) throw new Error("Research candidate data timestamp is invalid or from the future.");
  return {
    ...input,
    expiresAt: new Date(Date.parse(signalTime) + 86_400_000).toISOString(),
    plannedExitPrice: (close * 1.04).toFixed(8),
    plannedStopPrice: (close * 0.95).toFixed(8),
    proposedEntryPrice: close.toFixed(8),
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
  const intent = createImmutablePaperTradeIntent({ createdAt: currentAt, estimatedFees: "0", estimatedSlippage: "0", intentId: `intent:${candidate.symbol}:${candidate.dataAsOf}`, quantity: input.quantity, signal });
  return { approval: approvePaperTradeIntent({ approvedAt: currentAt, currentAt, equity: input.equity, intent, state: input.state }), intentId: intent.intentId };
}
