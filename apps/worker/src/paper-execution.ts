import type { PaperOrderSubmission, PaperOrderSubmissionRequest, PaperOrderSubmitter } from "@momentum/alpaca";
import { getPaperAutopilotConfig, isGlobalKillSwitchActive, type PaperAutopilotConfig } from "@momentum/config";
import { reconcilePaperOrder } from "@momentum/domain";

export interface PaperSubmissionPersistence {
  getByClientOrderId?(clientOrderId: string): Promise<unknown>;
  getByIntentId?(intentId: string): Promise<unknown>;
  recordSubmission(input: { readonly approvalId: string; readonly assetClass: string; readonly clientOrderId: string; readonly intentId: string; readonly marketSnapshot?: Readonly<Record<string, string | null>>; readonly quantity: string; readonly entryPrice?: string; readonly plannedStopPrice?: string; readonly plannedTargetPrice?: string; readonly strategyKey?: string; readonly strategyVersion?: string; readonly timeStopAt?: Date; readonly riskDecision?: Readonly<{ readonly approvalStatus?: "approved" | "rejected"; readonly estimatedLoss?: string; readonly estimatedLossPercent?: string; readonly policyVersion?: string; readonly reasons?: readonly string[] }>; readonly status: string; readonly symbol: string }): Promise<unknown>;
  reconcile(input: { readonly alpacaOrderId: string; readonly filledQuantity?: string; readonly intentId: string; readonly status: string; readonly submittedAt?: Date; readonly updatedAt?: Date }): Promise<unknown>;
  markFailed(intentId: string): Promise<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asExistingBrokerOrder(value: unknown, order: PaperOrderSubmissionRequest): PaperOrderSubmission | undefined {
  if (!isRecord(value) || typeof value.alpacaOrderId !== "string" || typeof value.status !== "string") return undefined;
  // Retries may recalculate a candidate quantity from the latest equity/mark.
  // Once a client order is broker-bound, its persisted quantity is the
  // authoritative approved quantity for reconciliation.
  const quantity = typeof value.quantity === "string" ? value.quantity : order.quantity;
  return {
    alpacaOrderId: value.alpacaOrderId,
    assetClass: order.assetClass,
    clientOrderId: order.clientOrderId,
    ...(typeof value.filledQuantity === "string" ? { filledQuantity: value.filledQuantity } : {}),
    quantity,
    status: value.status,
    ...(value.submittedAt instanceof Date ? { submittedAt: value.submittedAt.toISOString() } : typeof value.submittedAt === "string" ? { submittedAt: value.submittedAt } : {}),
    symbol: order.symbol,
    type: order.type,
    ...(value.updatedAt instanceof Date ? { updatedAt: value.updatedAt.toISOString() } : typeof value.updatedAt === "string" ? { updatedAt: value.updatedAt } : {}),
  };
}

export interface PaperExecutionResult {
  readonly brokerOrder: PaperOrderSubmission;
  readonly intentId: string;
  readonly status: "reconciled";
}

function getFailureReason(error: unknown, assetClass: PaperOrderSubmissionRequest["assetClass"]): string {
  const message = error instanceof Error ? error.message : "";
  if (assetClass === "crypto" && message.includes("crypto_order_entitlement_blocked")) return "crypto_order_entitlement_blocked";
  if (message.includes("HTTP ")) return "paper_order_provider_error";
  return "paper_order_failed_closed";
}

/** Submit a deterministic-risk-approved paper order without a per-order operator confirmation. */
export async function executePaperAutopilotOrder(input: {
  readonly autopilot?: PaperAutopilotConfig;
  readonly order: PaperOrderSubmissionRequest;
  readonly persistence: PaperSubmissionPersistence;
  readonly submitter: PaperOrderSubmitter;
  readonly notify?: (alert: { readonly code: string; readonly message: string; readonly severity: "critical" | "info" | "warning" }) => Promise<void> | void;
}): Promise<PaperExecutionResult> {
  const mode = input.autopilot ?? getPaperAutopilotConfig();
  if (!mode.enabled || mode.mode !== "paper_autopilot") throw new Error("Paper Autopilot mode is disabled.");
  if (isGlobalKillSwitchActive()) throw new Error("Paper order execution is blocked by the global kill switch.");
  if (input.order.approval.status !== "approved") throw new Error("A passing paper risk approval is required.");
  const intentId = input.order.approval.intentId;
  const existingByClientOrder = await input.persistence.getByClientOrderId?.(input.order.clientOrderId);
  const existingByIntent = existingByClientOrder ?? await input.persistence.getByIntentId?.(intentId);
  let submissionOrder = input.order;
  if (existingByIntent !== undefined && existingByIntent !== null) {
    const brokerOrder = asExistingBrokerOrder(existingByIntent, input.order);
    if (brokerOrder) return { brokerOrder, intentId, status: "reconciled" };
    if (!isRecord(existingByIntent) || existingByIntent.status !== "risk_dry_run_approved" || typeof existingByIntent.quantity !== "string") throw new Error("Paper order intent is already recorded without broker confirmation; refusing duplicate submission.");
    // A risk-evidence row may precede execution and has a different client
    // ID. Reuse its approved quantity for the broker request.
    submissionOrder = { ...input.order, quantity: existingByIntent.quantity };
  }
  await input.persistence.recordSubmission({ approvalId: submissionOrder.approval.approvalId, assetClass: submissionOrder.assetClass, clientOrderId: submissionOrder.clientOrderId, intentId, ...(submissionOrder.marketSnapshot ? { marketSnapshot: submissionOrder.marketSnapshot } : {}), quantity: submissionOrder.quantity, ...(submissionOrder.entryPrice ? { entryPrice: submissionOrder.entryPrice } : {}), ...(submissionOrder.plannedStopPrice ? { plannedStopPrice: submissionOrder.plannedStopPrice } : {}), ...(submissionOrder.plannedTargetPrice ? { plannedTargetPrice: submissionOrder.plannedTargetPrice } : {}), ...(submissionOrder.strategyKey ? { strategyKey: submissionOrder.strategyKey } : {}), ...(submissionOrder.strategyVersion ? { strategyVersion: submissionOrder.strategyVersion } : {}), ...(submissionOrder.timeStopAt ? { timeStopAt: new Date(submissionOrder.timeStopAt) } : {}), ...(submissionOrder.approval.riskDecision ? { riskDecision: submissionOrder.approval.riskDecision } : {}), status: "pending", symbol: submissionOrder.symbol });
  try {
    const brokerOrder = await input.submitter.submit(submissionOrder);
    const recovery = reconcilePaperOrder({ brokerClientOrderId: brokerOrder.clientOrderId, brokerStatus: brokerOrder.status, expectedClientOrderId: submissionOrder.clientOrderId, expectedQuantity: submissionOrder.quantity, ...(brokerOrder.filledQuantity ? { filledQuantity: brokerOrder.filledQuantity } : {}) });
    await input.persistence.reconcile({ alpacaOrderId: brokerOrder.alpacaOrderId, ...(recovery.filledQuantity ? { filledQuantity: recovery.filledQuantity } : {}), intentId, status: recovery.status, ...(brokerOrder.submittedAt ? { submittedAt: new Date(brokerOrder.submittedAt) } : {}), ...(brokerOrder.updatedAt ? { updatedAt: new Date(brokerOrder.updatedAt) } : {}) });
    await input.notify?.({ code: "paper_entry_submitted", message: `Paper entry submitted and reconciled: ${input.order.symbol} (${input.order.quantity}). Status: ${recovery.status}.`, severity: "info" });
    return { brokerOrder, intentId, status: "reconciled" };
  } catch (error) {
    await input.persistence.markFailed(intentId);
    const reason = getFailureReason(error, input.order.assetClass);
    await input.notify?.({ code: "paper_entry_failed", message: `Paper entry failed closed for ${input.order.symbol}; reason ${reason}; broker state requires reconciliation before retry.`, severity: "critical" });
    throw error;
  }
}

/** @deprecated Use executePaperAutopilotOrder; retained for internal compatibility. */
export const executeApprovedPaperOrder = executePaperAutopilotOrder;
