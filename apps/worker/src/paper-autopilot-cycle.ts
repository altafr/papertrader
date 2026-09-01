import type { ResearchWatchlistCandidate } from "@momentum/domain";
import type { PaperOrderSubmissionRequest } from "@momentum/alpaca";
import { isGlobalKillSwitchActive } from "@momentum/config";
import { createAccountStateRepository, createPaperOrderRepository, type Database, type PersistedPaperOrderSubmission } from "@momentum/db";

import { assessResearchCandidateRisk, buildRiskCandidate, isPaperBaselineVerified } from "./paper-risk-dry-run.js";
import { isCompleteExitPlan } from "@momentum/domain";

/**
 * Bound each cycle to a small candidate set. Broker-enabled cycles still
 * submit at most one order, but must evaluate more than the first candidate:
 * a blocked crypto symbol must not prevent an otherwise eligible equity
 * candidate from reaching the deterministic risk gate.
 */
export function selectPaperAutopilotCandidates<T>(candidates: readonly T[], executeApproved: boolean): readonly T[] {
  void executeApproved;
  return candidates.slice(0, 10);
}

export interface PaperAutopilotRiskCycleResult {
  readonly approvalStatus: "approved" | "rejected";
  readonly executionStatus: "not_submitted" | "reconciled";
  readonly intentId: string;
  readonly reasons: readonly string[];
  readonly symbol: string;
}

/** Telegram is reserved for selected/approved risk outcomes; all decisions remain persisted. */
export function shouldNotifyPaperRiskDecision(status: PaperAutopilotRiskCycleResult["approvalStatus"]): boolean {
  return status === "approved";
}

function canonicalSymbol(symbol: string): string {
  return symbol.replaceAll("/", "").trim().toUpperCase();
}

export function getUnmanagedPositionSymbols(
  positions: readonly { readonly assetClass: string; readonly symbol: string }[],
  plans: readonly { readonly assetClass: string; readonly symbol: string }[],
): readonly string[] {
  const completePlans = new Set(plans.map((plan) => `${plan.assetClass}:${canonicalSymbol(plan.symbol)}`));
  return positions.filter((position) => !completePlans.has(`${position.assetClass}:${canonicalSymbol(position.symbol)}`)).map((position) => position.symbol).slice(0, 20);
}

export function getPaperTimeInForce(assetClass: "crypto" | "us_equity"): "day" | "gtc" {
  return assetClass === "crypto" ? "gtc" : "day";
}

/** Bounded, human-readable entry explanation for the important Telegram alert. */
export function buildPaperRiskDecisionMessage(input: {
  readonly approvalReference?: string;
  readonly candidate: ResearchWatchlistCandidate;
  readonly entryPrice: string;
  readonly plannedStopPrice: string;
  readonly plannedTargetPrice?: string;
  readonly timeStopAt?: string;
}): string {
  const snapshot = input.candidate.marketSnapshot;
  const indicators = snapshot
    ? ` RSI14 ${snapshot.rsi14 ?? "n/a"}, EMA20 ${snapshot.ema20 ?? "n/a"}, EMA50 ${snapshot.ema50 ?? "n/a"}, RV20 ${snapshot.relativeVolume20 ?? "n/a"}.`
    : " Indicators unavailable. ";
  return `Paper entry selected: ${input.candidate.symbol} (${input.candidate.assetClass}), momentum ${input.candidate.momentumReturn}. Entry ${input.entryPrice}, stop ${input.plannedStopPrice}${input.plannedTargetPrice ? `, target ${input.plannedTargetPrice}` : ""}${input.timeStopAt ? `, time stop ${input.timeStopAt}` : ""}. Deterministic risk approved.${indicators}${input.approvalReference ? ` Ref ${input.approvalReference}.` : ""}`.slice(0, 900);
}

/**
 * Evaluates scheduled research candidates through the same deterministic risk
 * engine used by the guarded order path. This phase only persists a decision;
 * broker submission remains a separately gated build unit.
 */
export async function runPaperAutopilotRiskCycle(input: {
  readonly candidates: readonly ResearchWatchlistCandidate[];
  readonly db: Database;
  readonly quantity?: string;
  readonly quantityForCandidate?: (candidate: ResearchWatchlistCandidate, equity: string) => string;
  readonly now?: Date;
  readonly environment?: NodeJS.ProcessEnv;
  readonly approvalReference?: string;
  readonly executeApproved?: (request: PaperOrderSubmissionRequest) => Promise<void>;
  readonly notify?: (alert: { readonly code: string; readonly dedupeKey?: string; readonly message: string; readonly severity: "critical" | "info" | "warning" }) => Promise<void> | void;
}): Promise<readonly PaperAutopilotRiskCycleResult[]> {
  if (input.candidates.length === 0) return [];
  const now = input.now ?? new Date();
  const defaultQuantity = input.quantity ?? "1";
  const accountRepository = createAccountStateRepository(input.db);
  const model = await accountRepository.getLatestReadModel();
  if (!model) throw new Error("paper_autopilot_account_read_model_missing");
  const snapshot = model.snapshot;
  const initialSnapshot = await accountRepository.getInitial(snapshot.accountId);
  const baselineConfirmation = await accountRepository.getLatestPaperBaselineConfirmation(snapshot.accountId, "100000");
  const baselineVerified = Boolean(baselineConfirmation || (initialSnapshot && isPaperBaselineVerified(initialSnapshot.equity)));
  const repository = createPaperOrderRepository(input.db);
  const completePlans = (await repository.listExitPlans()).filter((plan) => isCompleteExitPlan(plan));
  const unmanagedPositions = getUnmanagedPositionSymbols(model.positions, completePlans);
  const accountFresh = Math.floor((now.getTime() - model.freshness.capturedAt.getTime()) / 1000) <= 172_800;
  const baseState = {
    accountBaselineVerified: baselineVerified,
    accountFresh,
    killSwitchActive: isGlobalKillSwitchActive(input.environment ?? process.env),
    openPositions: model.positions.map((position) => ({ assetClass: position.assetClass === "crypto" ? "crypto" as const : "us_equity" as const, marketValue: position.marketValue })),
    submittedEntriesLast24Hours: model.orders.filter((order) => order.side.toLowerCase() === "buy" && order.submittedAt && now.getTime() - order.submittedAt.getTime() <= 86_400_000).length,
    cryptoSyntheticBracketEnabled: (input.environment ?? process.env).CRYPTO_SYNTHETIC_BRACKET_ENABLED === "true" && (input.environment ?? process.env).POSITION_MANAGEMENT_SCHEDULER_ENABLED === "true",
    positionManagementHealthy: (input.environment ?? process.env).POSITION_MANAGEMENT_SCHEDULER_ENABLED === "true",
    ...(unmanagedPositions.length > 0 ? { unmanagedPositions } : {}),
  };
  const results: PaperAutopilotRiskCycleResult[] = [];
  let executionSubmitted = false;
  // A broker-enabled cycle evaluates a bounded candidate set but submits at
  // most one entry. The next cycle re-reconciles before considering another.
  const candidates = selectPaperAutopilotCandidates(input.candidates, Boolean(input.executeApproved));
  for (const candidate of candidates) {
    const quantity = input.quantityForCandidate?.(candidate, snapshot.equity) ?? defaultQuantity;
    const candidateAge = now.getTime() - Date.parse(candidate.dataAsOf);
    const state = { ...baseState, dataFresh: Number.isFinite(candidateAge) && candidateAge >= 0 && candidateAge <= 172_800_000 };
    const { approval, intentId } = assessResearchCandidateRisk({ candidate, currentAt: now.toISOString(), equity: snapshot.equity, quantity, state });
    const riskCandidate = buildRiskCandidate(candidate, now);
    const persisted: PersistedPaperOrderSubmission = {
      approvalId: approval.approvalId,
      assetClass: riskCandidate.assetClass,
      clientOrderId: `${intentId}:scheduled-risk`,
      intentId,
      entryPrice: riskCandidate.proposedEntryPrice,
      plannedStopPrice: riskCandidate.plannedStopPrice,
      plannedTargetPrice: riskCandidate.plannedExitPrice,
      ...(riskCandidate.timeStopAt ? { timeStopAt: new Date(riskCandidate.timeStopAt) } : {}),
      quantity,
      riskDecision: { approvalStatus: approval.status, estimatedLoss: approval.assessment.estimatedLoss, estimatedLossPercent: approval.assessment.estimatedLossPercent, policyVersion: approval.policyVersion, reasons: approval.assessment.reasons },
      status: approval.status === "approved" ? "risk_dry_run_approved" : "risk_dry_run_rejected",
      strategyKey: riskCandidate.strategyKey,
      strategyVersion: riskCandidate.strategyVersion,
      symbol: riskCandidate.symbol,
      ...(riskCandidate.marketSnapshot ? { marketSnapshot: riskCandidate.marketSnapshot as unknown as Readonly<Record<string, string | null>> } : {}),
    };
    await repository.recordSubmission(persisted);
    let executionStatus: PaperAutopilotRiskCycleResult["executionStatus"] = "not_submitted";
    if (approval.status === "approved" && input.executeApproved) {
      await input.executeApproved({ approval: { approvalId: approval.approvalId, intentId, riskDecision: { approvalStatus: approval.status, estimatedLoss: approval.assessment.estimatedLoss, estimatedLossPercent: approval.assessment.estimatedLossPercent, policyVersion: approval.policyVersion, reasons: approval.assessment.reasons }, status: "approved" }, assetClass: riskCandidate.assetClass, clientOrderId: `${intentId}-paper`, ...(riskCandidate.marketSnapshot ? { marketSnapshot: riskCandidate.marketSnapshot as unknown as Readonly<Record<string, string | null>> } : {}), quantity, entryPrice: riskCandidate.proposedEntryPrice, plannedStopPrice: riskCandidate.plannedStopPrice, plannedTargetPrice: riskCandidate.plannedExitPrice, ...(riskCandidate.timeStopAt ? { timeStopAt: riskCandidate.timeStopAt } : {}), strategyKey: riskCandidate.strategyKey, strategyVersion: riskCandidate.strategyVersion, side: "buy", symbol: riskCandidate.symbol, timeInForce: getPaperTimeInForce(riskCandidate.assetClass), type: "market" });
      executionStatus = "reconciled";
      executionSubmitted = true;
    }
    results.push({ approvalStatus: approval.status, executionStatus, intentId, reasons: approval.assessment.reasons, symbol: candidate.symbol });
    if (shouldNotifyPaperRiskDecision(approval.status)) {
      await input.notify?.({ code: "paper_risk_decision", dedupeKey: `paper_risk_decision:${intentId}`, message: buildPaperRiskDecisionMessage({ ...(input.approvalReference ? { approvalReference: input.approvalReference } : {}), candidate, entryPrice: riskCandidate.proposedEntryPrice, plannedStopPrice: riskCandidate.plannedStopPrice, plannedTargetPrice: riskCandidate.plannedExitPrice, ...(riskCandidate.timeStopAt ? { timeStopAt: riskCandidate.timeStopAt } : {}) }), severity: "info" });
    }
    // Do not place a second entry in the same reconciled cycle. This is
    // deliberately independent of Telegram delivery policy.
    if (executionSubmitted) break;
  }
  return results;
}
