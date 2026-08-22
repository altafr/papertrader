import { advanceStrategyStage, type StrategyPlugin, type StrategyStage } from "./strategy.js";
import type { ReplayEvidence } from "./research.js";
import type { ShadowPromotionEvidence } from "./shadow-promotion.js";
import type { PaperPromotionEvidence } from "./paper-promotion.js";

export interface StrategyLifecycleApproval {
  readonly approvedAt: string;
  readonly approvedBy: string;
  readonly note: string;
}

export interface StrategyLifecycleTransitionRequest {
  readonly actorId: string;
  readonly approval?: StrategyLifecycleApproval;
  readonly automatedChecksPass?: boolean;
  readonly evidence?: ReplayEvidence;
  readonly shadowEvidence?: ShadowPromotionEvidence;
  readonly paperEvidence?: PaperPromotionEvidence;
  readonly reason: string;
  readonly requestedAt: string;
  readonly strategyKey: string;
  readonly strategyVersion: string;
  readonly toStage: StrategyStage;
}

export interface StrategyLifecycleEvent {
  readonly actorId: string;
  readonly approval?: StrategyLifecycleApproval;
  readonly evidenceKey?: string;
  readonly eventId: string;
  readonly fromStage: StrategyStage;
  readonly reason: string;
  readonly requestedAt: string;
  readonly strategyKey: string;
  readonly strategyVersion: string;
  readonly toStage: StrategyStage;
}

export interface StrategyLifecycleRecord {
  readonly events: readonly StrategyLifecycleEvent[];
  readonly revision: number;
  readonly stage: StrategyStage;
  readonly strategyKey: string;
  readonly strategyVersion: string;
}

function immutable<T extends object>(value: T): T {
  return Object.freeze(value);
}

export function createStrategyLifecycleStore<Parameters extends object>(strategy: StrategyPlugin<Parameters>) {
  let record: StrategyLifecycleRecord = immutable({
    events: Object.freeze([]), revision: 0, stage: strategy.stage, strategyKey: strategy.key, strategyVersion: strategy.version,
  });
  return {
    get(): StrategyLifecycleRecord { return record; },
    transition(request: StrategyLifecycleTransitionRequest): StrategyLifecycleRecord {
      if (request.strategyKey !== record.strategyKey || request.strategyVersion !== record.strategyVersion) throw new Error("Lifecycle request targets a different strategy version.");
      if (!request.actorId.trim()) throw new Error("Lifecycle transition requires an actor identity.");
      if (!request.reason.trim()) throw new Error("Lifecycle transition requires a reason.");
      if (!request.requestedAt || Number.isNaN(Date.parse(request.requestedAt))) throw new Error("Lifecycle transition requires a valid request timestamp.");
      const nextStage = advanceStrategyStage(record.stage, request.toStage);
      const isReplayGate = record.stage === "disabled" && nextStage === "replay";
      const isShadowGate = record.stage === "replay" && nextStage === "shadow";
      const isPaperGate = record.stage === "shadow" && nextStage === "paper";
      if (!isReplayGate && !isShadowGate && !isPaperGate) throw new Error("Only disabled to replay, replay to shadow, or shadow to paper lifecycle gates are implemented.");
      if (!request.approval || request.approval.approvedBy !== request.actorId || !request.approval.note.trim()) throw new Error(`${isReplayGate ? "Disabled to replay" : isShadowGate ? "Replay to shadow" : "Shadow to paper"} requires explicit operator approval with a note.`);
      const evidenceKey = isReplayGate ? request.evidence && `${request.evidence.strategyKey}@${request.evidence.strategyVersion}` : isShadowGate ? request.shadowEvidence && `${request.shadowEvidence.strategyKey}@${request.shadowEvidence.strategyVersion}:shadow` : request.paperEvidence && `${request.paperEvidence.strategyKey}@${request.paperEvidence.strategyVersion}:paper`;
      if (isReplayGate) {
        if (!request.evidence || request.evidence.strategyKey !== record.strategyKey || request.evidence.strategyVersion !== record.strategyVersion) throw new Error("Replay evidence must match the strategy version.");
        const hasRegimes = request.evidence.results.length >= 3 && new Set(request.evidence.results.map((result) => result.regime)).size >= 3;
        if (!hasRegimes) throw new Error("Replay evidence must cover at least three distinct regimes.");
        if (request.automatedChecksPass !== true) throw new Error("Replay evidence must pass automated checks before promotion.");
      } else if (isShadowGate) {
        if (!request.shadowEvidence || request.shadowEvidence.strategyKey !== record.strategyKey || request.shadowEvidence.strategyVersion !== record.strategyVersion) throw new Error("Shadow evidence must match the strategy version.");
        if (request.automatedChecksPass !== true) throw new Error("Shadow evidence must pass automated checks before promotion.");
      } else {
        if (!request.paperEvidence || request.paperEvidence.strategyKey !== record.strategyKey || request.paperEvidence.strategyVersion !== record.strategyVersion) throw new Error("Paper evidence must match the strategy version.");
        if (request.automatedChecksPass !== true) throw new Error("Paper evidence must pass automated checks before promotion.");
      }
      const event: StrategyLifecycleEvent = immutable({
        actorId: request.actorId, approval: request.approval, evidenceKey: evidenceKey!,
        eventId: `${record.strategyKey}@${record.strategyVersion}#${record.revision + 1}`, fromStage: record.stage, reason: request.reason,
        requestedAt: request.requestedAt, strategyKey: record.strategyKey, strategyVersion: record.strategyVersion, toStage: nextStage,
      });
      record = immutable({ ...record, events: Object.freeze([...record.events, event]), revision: record.revision + 1, stage: nextStage });
      return record;
    },
  };
}
