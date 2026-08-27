import type { ResearchWatchlistCandidate } from "@momentum/domain";
import type { PaperOrderSubmissionRequest } from "@momentum/alpaca";
import { isGlobalKillSwitchActive } from "@momentum/config";
import { createAccountStateRepository, createPaperOrderRepository, type Database, type PersistedPaperOrderSubmission } from "@momentum/db";

import { assessResearchCandidateRisk, buildRiskCandidate, isPaperBaselineVerified } from "./paper-risk-dry-run.js";

/** Keep broker-enabled cycles to one approval against a single reconciled snapshot. */
export function selectPaperAutopilotCandidates<T>(candidates: readonly T[], executeApproved: boolean): readonly T[] {
  return candidates.slice(0, executeApproved ? 1 : 10);
}

export interface PaperAutopilotRiskCycleResult {
  readonly approvalStatus: "approved" | "rejected";
  readonly executionStatus: "not_submitted" | "reconciled";
  readonly intentId: string;
  readonly symbol: string;
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
  readonly now?: Date;
  readonly environment?: NodeJS.ProcessEnv;
  readonly approvalReference?: string;
  readonly executeApproved?: (request: PaperOrderSubmissionRequest) => Promise<void>;
  readonly notify?: (alert: { readonly code: string; readonly message: string; readonly severity: "critical" | "info" | "warning" }) => Promise<void> | void;
}): Promise<readonly PaperAutopilotRiskCycleResult[]> {
  if (input.candidates.length === 0) return [];
  const now = input.now ?? new Date();
  const quantity = input.quantity ?? "1";
  const accountRepository = createAccountStateRepository(input.db);
  const model = await accountRepository.getLatestReadModel();
  if (!model) throw new Error("paper_autopilot_account_read_model_missing");
  const snapshot = model.snapshot;
  const initialSnapshot = await accountRepository.getInitial(snapshot.accountId);
  const baselineConfirmation = await accountRepository.getLatestPaperBaselineConfirmation(snapshot.accountId, "100000");
  const baselineVerified = Boolean(baselineConfirmation || (initialSnapshot && isPaperBaselineVerified(initialSnapshot.equity)));
  const accountFresh = Math.floor((now.getTime() - model.freshness.capturedAt.getTime()) / 1000) <= 172_800;
  const baseState = {
    accountBaselineVerified: baselineVerified,
    accountFresh,
    killSwitchActive: isGlobalKillSwitchActive(input.environment ?? process.env),
    openPositions: model.positions.map((position) => ({ assetClass: position.assetClass === "crypto" ? "crypto" as const : "us_equity" as const, marketValue: position.marketValue })),
    submittedEntriesLast24Hours: model.orders.filter((order) => order.side.toLowerCase() === "buy" && order.submittedAt && now.getTime() - order.submittedAt.getTime() <= 86_400_000).length,
  };
  const repository = createPaperOrderRepository(input.db);
  const results: PaperAutopilotRiskCycleResult[] = [];
  // A broker-enabled cycle is deliberately bounded to one entry. The next
  // cycle re-reconciles account/positions before considering another candidate.
  const candidates = selectPaperAutopilotCandidates(input.candidates, Boolean(input.executeApproved));
  for (const candidate of candidates) {
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
      quantity,
      riskDecision: { estimatedLoss: approval.assessment.estimatedLoss, estimatedLossPercent: approval.assessment.estimatedLossPercent, policyVersion: approval.policyVersion, reasons: approval.assessment.reasons },
      status: approval.status === "approved" ? "risk_dry_run_approved" : "risk_dry_run_rejected",
      strategyKey: riskCandidate.strategyKey,
      strategyVersion: riskCandidate.strategyVersion,
      symbol: riskCandidate.symbol,
      ...(riskCandidate.marketSnapshot ? { marketSnapshot: riskCandidate.marketSnapshot as unknown as Readonly<Record<string, string | null>> } : {}),
    };
    await repository.recordSubmission(persisted);
    let executionStatus: PaperAutopilotRiskCycleResult["executionStatus"] = "not_submitted";
    if (approval.status === "approved" && input.executeApproved) {
      await input.executeApproved({ approval: { approvalId: approval.approvalId, intentId, riskDecision: { estimatedLoss: approval.assessment.estimatedLoss, estimatedLossPercent: approval.assessment.estimatedLossPercent, policyVersion: approval.policyVersion, reasons: approval.assessment.reasons }, status: "approved" }, assetClass: riskCandidate.assetClass, clientOrderId: `${intentId}-paper`, ...(riskCandidate.marketSnapshot ? { marketSnapshot: riskCandidate.marketSnapshot as unknown as Readonly<Record<string, string | null>> } : {}), quantity, entryPrice: riskCandidate.proposedEntryPrice, plannedStopPrice: riskCandidate.plannedStopPrice, plannedTargetPrice: riskCandidate.plannedExitPrice, strategyKey: riskCandidate.strategyKey, strategyVersion: riskCandidate.strategyVersion, side: "buy", symbol: riskCandidate.symbol, timeInForce: "day", type: "market" });
      executionStatus = "reconciled";
    }
    results.push({ approvalStatus: approval.status, executionStatus, intentId, symbol: candidate.symbol });
    await input.notify?.({ code: "paper_risk_decision", message: `${candidate.symbol} scheduled paper risk decision: ${approval.status}; ${approval.assessment.reasons.join(" ") || "all deterministic checks passed"}.${input.approvalReference ? ` Reference ${input.approvalReference}.` : ""}`, severity: approval.status === "approved" ? "info" : "warning" });
  }
  return results;
}
