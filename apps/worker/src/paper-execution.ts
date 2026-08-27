import type { PaperOrderSubmission, PaperOrderSubmissionRequest, PaperOrderSubmitter } from "@momentum/alpaca";
import { getPaperAutopilotConfig, isGlobalKillSwitchActive, type PaperAutopilotConfig } from "@momentum/config";
import { reconcilePaperOrder } from "@momentum/domain";

export interface PaperSubmissionPersistence {
  recordSubmission(input: { readonly approvalId: string; readonly assetClass: string; readonly clientOrderId: string; readonly intentId: string; readonly marketSnapshot?: Readonly<Record<string, string | null>>; readonly quantity: string; readonly entryPrice?: string; readonly plannedStopPrice?: string; readonly plannedTargetPrice?: string; readonly strategyKey?: string; readonly strategyVersion?: string; readonly timeStopAt?: Date; readonly riskDecision?: Readonly<{ readonly estimatedLoss?: string; readonly estimatedLossPercent?: string; readonly policyVersion?: string; readonly reasons?: readonly string[] }>; readonly status: string; readonly symbol: string }): Promise<unknown>;
  reconcile(input: { readonly alpacaOrderId: string; readonly filledQuantity?: string; readonly intentId: string; readonly status: string; readonly submittedAt?: Date; readonly updatedAt?: Date }): Promise<unknown>;
  markFailed(intentId: string): Promise<unknown>;
}

export interface PaperExecutionResult {
  readonly brokerOrder: PaperOrderSubmission;
  readonly intentId: string;
  readonly status: "reconciled";
}

/** Submit a deterministic-risk-approved paper order without a per-order operator confirmation. */
export async function executePaperAutopilotOrder(input: {
  readonly autopilot?: PaperAutopilotConfig;
  readonly order: PaperOrderSubmissionRequest;
  readonly persistence: PaperSubmissionPersistence;
  readonly submitter: PaperOrderSubmitter;
  readonly notify?: (alert: { readonly code: string; readonly message: string; readonly severity: "critical" | "info" | "warning" }) => void;
}): Promise<PaperExecutionResult> {
  const mode = input.autopilot ?? getPaperAutopilotConfig();
  if (!mode.enabled || mode.mode !== "paper_autopilot") throw new Error("Paper Autopilot mode is disabled.");
  if (isGlobalKillSwitchActive()) throw new Error("Paper order execution is blocked by the global kill switch.");
  if (input.order.approval.status !== "approved") throw new Error("A passing paper risk approval is required.");
  const intentId = input.order.approval.intentId;
  await input.persistence.recordSubmission({ approvalId: input.order.approval.approvalId, assetClass: input.order.assetClass, clientOrderId: input.order.clientOrderId, intentId, ...(input.order.marketSnapshot ? { marketSnapshot: input.order.marketSnapshot } : {}), quantity: input.order.quantity, ...(input.order.entryPrice ? { entryPrice: input.order.entryPrice } : {}), ...(input.order.plannedStopPrice ? { plannedStopPrice: input.order.plannedStopPrice } : {}), ...(input.order.plannedTargetPrice ? { plannedTargetPrice: input.order.plannedTargetPrice } : {}), ...(input.order.strategyKey ? { strategyKey: input.order.strategyKey } : {}), ...(input.order.strategyVersion ? { strategyVersion: input.order.strategyVersion } : {}), ...(input.order.timeStopAt ? { timeStopAt: new Date(input.order.timeStopAt) } : {}), ...(input.order.approval.riskDecision ? { riskDecision: input.order.approval.riskDecision } : {}), status: "pending", symbol: input.order.symbol });
  try {
    const brokerOrder = await input.submitter.submit(input.order);
    const recovery = reconcilePaperOrder({ brokerClientOrderId: brokerOrder.clientOrderId, brokerStatus: brokerOrder.status, expectedClientOrderId: input.order.clientOrderId, expectedQuantity: input.order.quantity, ...(brokerOrder.filledQuantity ? { filledQuantity: brokerOrder.filledQuantity } : {}) });
    await input.persistence.reconcile({ alpacaOrderId: brokerOrder.alpacaOrderId, ...(recovery.filledQuantity ? { filledQuantity: recovery.filledQuantity } : {}), intentId, status: recovery.status, ...(brokerOrder.submittedAt ? { submittedAt: new Date(brokerOrder.submittedAt) } : {}), ...(brokerOrder.updatedAt ? { updatedAt: new Date(brokerOrder.updatedAt) } : {}) });
    input.notify?.({ code: "paper_entry_submitted", message: `Paper entry submitted and reconciled: ${input.order.symbol} (${input.order.quantity}). Status: ${recovery.status}.`, severity: "info" });
    return { brokerOrder, intentId, status: "reconciled" };
  } catch (error) {
    await input.persistence.markFailed(intentId);
    input.notify?.({ code: "paper_entry_failed", message: `Paper entry failed closed for ${input.order.symbol}; broker state requires reconciliation before retry.`, severity: "critical" });
    throw error;
  }
}

/** @deprecated Use executePaperAutopilotOrder; retained for internal compatibility. */
export const executeApprovedPaperOrder = executePaperAutopilotOrder;
