import { z } from "zod";

import { assessPaperPromotion, assessReplayPromotion, assessShadowPromotion, createStrategyLifecycleStore, INITIAL_MOMENTUM_STRATEGIES, type PaperPromotionEvidence, type ReplayEvidence, type ShadowPromotionEvidence, type StrategyPlugin } from "@momentum/domain";
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
export interface ReplayToShadowPersistence {
  appendReplayToShadow(event: PersistedStrategyLifecycleEvent): Promise<unknown>;
  getLatest(strategyKey: string, strategyVersion: string): Promise<{ readonly revision: number; readonly toStage: string } | undefined>;
}
export interface ShadowToPaperPersistence {
  appendShadowToPaper(event: PersistedStrategyLifecycleEvent): Promise<unknown>;
  getLatest(strategyKey: string, strategyVersion: string): Promise<{ readonly revision: number; readonly toStage: string } | undefined>;
  getLatestPaperEvidence(strategyKey: string, strategyVersion: string): Promise<PaperPromotionEvidenceRecord | undefined>;
}
export interface PaperPromotionEvidenceRecord extends PaperPromotionEvidence { readonly capturedAt: Date; readonly evidenceId: string; }
export interface ClosedShadowObservationSource {
  listClosed(strategyKey: string, strategyVersion: string): Promise<readonly {
    readonly observation: { readonly observationId: string; readonly symbol: string };
    readonly outcome: { readonly observedAt: Date; readonly reason: string; readonly returnPercent: string };
  }[]>;
}

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

const shadowTimestamp = z.string().datetime({ offset: true });
export const replayToShadowRequestSchema = z.object({
  approval: z.object({ approvedAt: shadowTimestamp, approvedBy: z.string().min(1), note: z.string().trim().min(1).max(2_000) }),
  reason: z.string().trim().min(1).max(2_000), requestedAt: shadowTimestamp,
  strategyKey: z.string().min(1), strategyVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
});

export const DEFAULT_SHADOW_PROMOTION_POLICY = { maxLossPercent: "5", minimumClosedObservations: 10, minimumPositiveObservations: 6 } as const;
export interface ReplayToShadowCommandResult { readonly event: PersistedStrategyLifecycleEvent; readonly revision: number; readonly stage: "shadow"; readonly strategyKey: string; readonly strategyVersion: string; readonly sampleSize: number; }

export async function approveReplayToShadow(input: { readonly actorId: string; readonly body: unknown; readonly persistence: ReplayToShadowPersistence; readonly observations: ClosedShadowObservationSource }): Promise<ReplayToShadowCommandResult> {
  const request = replayToShadowRequestSchema.parse(input.body);
  if (request.approval.approvedBy !== input.actorId) throw new Error("Approval must match the authenticated operator.");
  const latest = await input.persistence.getLatest(request.strategyKey, request.strategyVersion);
  if (!latest || latest.toStage !== "replay") throw new Error("Strategy must have a recorded replay stage before shadow promotion.");
  const rows = await input.observations.listClosed(request.strategyKey, request.strategyVersion);
  const validReasons = new Set(["expired", "invalidated", "stop", "target", "time_stop"]);
  const evidence: ShadowPromotionEvidence = {
    strategyKey: request.strategyKey,
    strategyVersion: request.strategyVersion,
    observations: rows.map(({ observation, outcome }) => {
      if (!validReasons.has(outcome.reason)) throw new Error("Persisted shadow outcome has an unsupported reason.");
      return { observationId: observation.observationId, observedAt: outcome.observedAt.toISOString(), reason: outcome.reason as "expired" | "invalidated" | "stop" | "target" | "time_stop", returnPercent: outcome.returnPercent, symbol: observation.symbol };
    }),
  };
  const assessment = assessShadowPromotion(evidence, DEFAULT_SHADOW_PROMOTION_POLICY);
  const strategy = { ...findStrategy(request.strategyKey, request.strategyVersion), stage: "replay" as const };
  const record = createStrategyLifecycleStore(strategy).transition({ actorId: input.actorId, approval: request.approval, automatedChecksPass: assessment.automatedChecksPass, reason: request.reason, requestedAt: request.requestedAt, shadowEvidence: evidence, strategyKey: request.strategyKey, strategyVersion: request.strategyVersion, toStage: "shadow" });
  const transition = record.events[record.events.length - 1];
  if (!transition?.approval || !transition.evidenceKey) throw new Error("Lifecycle transition did not produce a complete audit event.");
  const nextRevision = latest.revision + 1;
  const event: PersistedStrategyLifecycleEvent = { actorId: transition.actorId, approvedAt: new Date(transition.approval.approvedAt), approvedBy: transition.approval.approvedBy, approvalNote: transition.approval.note, evidenceKey: transition.evidenceKey, eventId: `${request.strategyKey}@${request.strategyVersion}#${nextRevision}`, fromStage: "replay", reason: transition.reason, requestedAt: new Date(transition.requestedAt), revision: nextRevision, strategyKey: transition.strategyKey, strategyVersion: transition.strategyVersion, toStage: "shadow" };
  await input.persistence.appendReplayToShadow(event);
  return { event, revision: nextRevision, sampleSize: assessment.sampleSize, stage: "shadow", strategyKey: record.strategyKey, strategyVersion: record.strategyVersion };
}

export const shadowToPaperRequestSchema = z.object({
  approval: z.object({ approvedAt: shadowTimestamp, approvedBy: z.string().min(1), note: z.string().trim().min(1).max(2_000) }),
  reason: z.string().trim().min(1).max(2_000), requestedAt: shadowTimestamp,
  strategyKey: z.string().min(1), strategyVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
});
export interface ShadowToPaperCommandResult { readonly closedTrades: number; readonly event: PersistedStrategyLifecycleEvent; readonly revision: number; readonly stage: "paper"; readonly strategyKey: string; readonly strategyVersion: string; }

export async function approveShadowToPaper(input: { readonly actorId: string; readonly body: unknown; readonly persistence: ShadowToPaperPersistence }): Promise<ShadowToPaperCommandResult> {
  const request = shadowToPaperRequestSchema.parse(input.body);
  if (request.approval.approvedBy !== input.actorId) throw new Error("Approval must match the authenticated operator.");
  const latest = await input.persistence.getLatest(request.strategyKey, request.strategyVersion);
  if (!latest || latest.toStage !== "shadow") throw new Error("Strategy must have a recorded shadow stage before paper promotion.");
  const persisted = await input.persistence.getLatestPaperEvidence(request.strategyKey, request.strategyVersion);
  if (!persisted) throw new Error("Paper-forward evidence is not available for this strategy version.");
  const evidence: PaperPromotionEvidence = {
    closedTrades: persisted.closedTrades, consecutiveCalendarDays: persisted.consecutiveCalendarDays, duplicateOrderCount: persisted.duplicateOrderCount,
    maxDrawdownPercent: persisted.maxDrawdownPercent, positiveTrades: persisted.positiveTrades, riskViolationCount: persisted.riskViolationCount,
    staleDataBreachCount: persisted.staleDataBreachCount, strategyKey: persisted.strategyKey, strategyVersion: persisted.strategyVersion,
  };
  const assessment = assessPaperPromotion(evidence);
  const strategy = { ...findStrategy(request.strategyKey, request.strategyVersion), stage: "shadow" as const };
  const record = createStrategyLifecycleStore(strategy).transition({ actorId: input.actorId, approval: request.approval, automatedChecksPass: assessment.automatedChecksPass, paperEvidence: evidence, reason: request.reason, requestedAt: request.requestedAt, strategyKey: request.strategyKey, strategyVersion: request.strategyVersion, toStage: "paper" });
  const transition = record.events[record.events.length - 1];
  if (!transition?.approval || !transition.evidenceKey) throw new Error("Lifecycle transition did not produce a complete audit event.");
  const nextRevision = latest.revision + 1;
  const event: PersistedStrategyLifecycleEvent = { actorId: transition.actorId, approvedAt: new Date(transition.approval.approvedAt), approvedBy: transition.approval.approvedBy, approvalNote: transition.approval.note, evidenceKey: transition.evidenceKey, eventId: `${request.strategyKey}@${request.strategyVersion}#${nextRevision}`, fromStage: "shadow", reason: transition.reason, requestedAt: new Date(transition.requestedAt), revision: nextRevision, strategyKey: transition.strategyKey, strategyVersion: transition.strategyVersion, toStage: "paper" };
  await input.persistence.appendShadowToPaper(event);
  return { closedTrades: evidence.closedTrades, event, revision: nextRevision, stage: "paper", strategyKey: record.strategyKey, strategyVersion: record.strategyVersion };
}
