import * as DecimalModule from "decimal.js";

import { assessPaperRisk, type ImmutablePaperSignal, type PaperRiskAssessment, type PaperRiskPolicy, type PaperRiskState } from "./paper-risk.js";
import type { DecimalString } from "./metrics.js";

interface DecimalValue {
  isZero(): boolean;
  isNegative(): boolean;
}
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

export interface ImmutablePaperTradeIntent {
  readonly createdAt: string;
  readonly estimatedFees: DecimalString;
  readonly estimatedSlippage: DecimalString;
  readonly expiresAt: string;
  readonly intentId: string;
  readonly quantity: DecimalString;
  readonly signal: ImmutablePaperSignal;
}

export interface PaperTradeApproval {
  readonly approvedAt: string;
  readonly approvalId: string;
  readonly assessment: PaperRiskAssessment;
  readonly expiresAt: string;
  readonly intentId: string;
  readonly policyVersion: "paper-risk-v1";
  readonly status: "approved" | "rejected";
}

function positiveDecimal(value: string, name: string): void {
  try {
    const parsed = new Decimal(value);
    if (parsed.isNegative() || parsed.isZero()) throw new Error(`${name} must be greater than zero.`);
  } catch {
    throw new Error(`${name} must be a positive decimal string.`);
  }
}

function nonNegativeDecimal(value: string, name: string): void {
  try {
    const parsed = new Decimal(value);
    if (parsed.isNegative()) throw new Error(`${name} must not be negative.`);
  } catch {
    throw new Error(`${name} must be a non-negative decimal string.`);
  }
}

function validTimestamp(value: string, name: string): number {
  const time = Date.parse(value);
  if (!value || Number.isNaN(time)) throw new Error(`${name} must be a valid timestamp.`);
  return time;
}

export function createImmutablePaperTradeIntent(input: {
  readonly createdAt: string;
  readonly estimatedFees: DecimalString;
  readonly estimatedSlippage: DecimalString;
  readonly intentId: string;
  readonly quantity: DecimalString;
  readonly signal: ImmutablePaperSignal;
}): ImmutablePaperTradeIntent {
  if (!input.intentId.trim()) throw new Error("Paper trade intent ID is required.");
  const createdAt = validTimestamp(input.createdAt, "Intent creation timestamp");
  const expiresAt = validTimestamp(input.signal.candidate.expiresAt, "Intent expiry timestamp");
  if (expiresAt <= createdAt) throw new Error("Trade intent must expire after creation.");
  positiveDecimal(input.quantity, "Intent quantity");
  nonNegativeDecimal(input.estimatedFees, "Estimated fees");
  nonNegativeDecimal(input.estimatedSlippage, "Estimated slippage");
  return Object.freeze({
    createdAt: input.createdAt,
    estimatedFees: input.estimatedFees,
    estimatedSlippage: input.estimatedSlippage,
    expiresAt: input.signal.candidate.expiresAt,
    intentId: input.intentId,
    quantity: input.quantity,
    signal: input.signal,
  });
}

export function approvePaperTradeIntent(input: {
  readonly approvedAt: string;
  readonly currentAt: string;
  readonly intent: ImmutablePaperTradeIntent;
  readonly policy?: PaperRiskPolicy;
  readonly state: PaperRiskState;
  readonly equity: DecimalString;
}): PaperTradeApproval {
  const currentTime = validTimestamp(input.currentAt, "Current timestamp");
  validTimestamp(input.approvedAt, "Approval timestamp");
  const assessment = assessPaperRisk({ estimatedFees: input.intent.estimatedFees, estimatedSlippage: input.intent.estimatedSlippage, equity: input.equity, quantity: input.intent.quantity, signal: input.intent.signal, state: input.state, ...(input.policy ? { policy: input.policy } : {}) });
  const reasons = [...assessment.reasons];
  if (currentTime >= Date.parse(input.intent.expiresAt)) reasons.push("Trade intent has expired.");
  const finalAssessment: PaperRiskAssessment = Object.freeze({ ...assessment, passes: reasons.length === 0, reasons: Object.freeze(reasons) });
  return Object.freeze({ approvedAt: input.approvedAt, approvalId: `${input.intent.intentId}:${input.approvedAt}`, assessment: finalAssessment, expiresAt: input.intent.expiresAt, intentId: input.intent.intentId, policyVersion: "paper-risk-v1", status: finalAssessment.passes ? "approved" : "rejected" });
}

export function createPaperTradeApprovalStore() {
  const approvals = new Map<string, PaperTradeApproval>();
  return {
    append(approval: PaperTradeApproval): PaperTradeApproval {
      if (approvals.has(approval.intentId)) throw new Error("A paper trade intent already has an approval record.");
      approvals.set(approval.intentId, approval);
      return approval;
    },
    get(intentId: string): PaperTradeApproval | undefined { return approvals.get(intentId); },
  };
}
