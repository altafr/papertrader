import { z } from "zod";

import { assessReplayPromotion, createStrategyLifecycleStore, INITIAL_MOMENTUM_STRATEGIES, type ReplayEvidence, type StrategyPlugin } from "@momentum/domain";
import type { PersistedStrategyLifecycleEvent } from "@momentum/db";

const decimalString = z.string().regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/, "must be a decimal string");
const timestamp = z.string().datetime({ offset: true });
const metrics = z.object({
  finalEquity: decimalString, initialEquity: decimalString, maxDrawdownAmount: decimalString, maxDrawdownPercent: decimalString,
  totalPnl: decimalString, totalReturnPercent: decimalString,
});
const replay = z.object({
  evaluatedBars: z.number().int().nonnegative(), metrics, skippedSignals: z.number().int().nonnegative(),
  trades: z.array(z.object({ entryPrice: decimalString, exitPrice: decimalString, fees: decimalString, grossPnl: decimalString, netPnl: decimalString, signalTime: timestamp, slippage: decimalString, symbol: z.string().min(1) })),
});

export const disabledToReplayRequestSchema = z.object({
  approval: z.object({ approvedAt: timestamp, approvedBy: z.string().min(1), note: z.string().trim().min(1).max(2_000) }),
  evidence: z.object({ strategyKey: z.string().min(1), strategyVersion: z.string().regex(/^\d+\.\d+\.\d+$/), results: z.array(z.object({ name: z.string().min(1), regime: z.enum(["bull", "bear", "choppy"]), replay })) }),
  reason: z.string().trim().min(1).max(2_000), requestedAt: timestamp, strategyKey: z.string().min(1), strategyVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
});

export const DEFAULT_REPLAY_PROMOTION_POLICY = { maxDrawdownPercent: "5", minimumPositiveRegimes: 2, minimumTrades: 3 } as const;

export interface DisabledToReplayCommandResult { readonly event: PersistedStrategyLifecycleEvent; readonly revision: number; readonly stage: "replay"; readonly strategyKey: string; readonly strategyVersion: string; }
export interface StrategyLifecyclePersistence { appendDisabledToReplay(event: PersistedStrategyLifecycleEvent): Promise<unknown>; }

function findStrategy(strategyKey: string, strategyVersion: string) {
  const strategy = INITIAL_MOMENTUM_STRATEGIES.find((candidate) => candidate.key === strategyKey && candidate.version === strategyVersion);
  if (!strategy) throw new Error("Unknown or unsupported strategy version.");
  return strategy as unknown as StrategyPlugin<object>;
}

export async function approveDisabledToReplay(input: { readonly actorId: string; readonly body: unknown; readonly persistence: StrategyLifecyclePersistence }): Promise<DisabledToReplayCommandResult> {
  const request = disabledToReplayRequestSchema.parse(input.body);
  if (request.approval.approvedBy !== input.actorId) throw new Error("Approval must match the authenticated operator.");
  if (request.strategyKey !== request.evidence.strategyKey || request.strategyVersion !== request.evidence.strategyVersion) throw new Error("Request and evidence strategy versions must match.");
  const strategy = findStrategy(request.strategyKey, request.strategyVersion);
  const evidence = request.evidence as ReplayEvidence;
  const assessment = assessReplayPromotion(evidence, DEFAULT_REPLAY_PROMOTION_POLICY);
  const record = createStrategyLifecycleStore(strategy).transition({ actorId: input.actorId, approval: { approvedAt: request.approval.approvedAt, approvedBy: request.approval.approvedBy, note: request.approval.note }, automatedChecksPass: assessment.automatedChecksPass, evidence, reason: request.reason, requestedAt: request.requestedAt, strategyKey: request.strategyKey, strategyVersion: request.strategyVersion, toStage: "replay" });
  const transition = record.events[record.events.length - 1];
  if (!transition?.approval || !transition.evidenceKey) throw new Error("Lifecycle transition did not produce a complete audit event.");
  const event: PersistedStrategyLifecycleEvent = { actorId: transition.actorId, approvedAt: new Date(transition.approval.approvedAt), approvedBy: transition.approval.approvedBy, approvalNote: transition.approval.note, evidenceKey: transition.evidenceKey, eventId: transition.eventId, fromStage: "disabled", reason: transition.reason, requestedAt: new Date(transition.requestedAt), revision: record.revision, strategyKey: transition.strategyKey, strategyVersion: transition.strategyVersion, toStage: "replay" };
  await input.persistence.appendDisabledToReplay(event);
  return { event, revision: record.revision, stage: "replay", strategyKey: record.strategyKey, strategyVersion: record.strategyVersion };
}
