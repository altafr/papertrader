import type { DurableQueueInspection } from "./durable-scheduler.js";

export interface DurableOneRunVerification {
  readonly blockedReasons: readonly string[];
  readonly queues: DurableQueueInspection;
  readonly reconciliation: {
    readonly ageSeconds?: number;
    readonly capturedAt?: string;
    readonly status: "fresh" | "stale" | "unavailable";
  };
  readonly status: "incomplete" | "verified";
}

export function assessDurableOneRunVerification(input: { readonly queues: DurableQueueInspection; readonly capturedAt?: Date | string; readonly now?: Date }): DurableOneRunVerification {
  const now = input.now ?? new Date();
  const captured = input.capturedAt instanceof Date ? input.capturedAt : input.capturedAt ? new Date(input.capturedAt) : undefined;
  const validCapture = captured && !Number.isNaN(captured.getTime());
  const ageSeconds = validCapture ? Math.max(0, Math.floor((now.getTime() - captured.getTime()) / 1000)) : undefined;
  const reconciliationStatus = ageSeconds === undefined ? "unavailable" : ageSeconds > 172_800 ? "stale" : "fresh";
  const blockedReasons = [
    ...(input.queues.workQueue.present && input.queues.deadLetterQueue.present ? [] : ["queues_missing"]),
    ...(input.queues.workQueue.queuedCount === 0 && input.queues.workQueue.activeCount === 0 ? [] : ["work_queue_not_drained"]),
    ...(input.queues.deadLetterQueue.queuedCount === 0 && input.queues.deadLetterQueue.activeCount === 0 && input.queues.deadLetterQueue.failedCount === 0 ? [] : ["dead_letter_queue_not_empty"]),
    ...(reconciliationStatus === "fresh" ? [] : [`reconciliation_${reconciliationStatus}`]),
  ];
  return {
    blockedReasons,
    queues: input.queues,
    reconciliation: { ...(ageSeconds !== undefined ? { ageSeconds } : {}), ...(validCapture ? { capturedAt: captured.toISOString() } : {}), status: reconciliationStatus },
    status: blockedReasons.length === 0 ? "verified" : "incomplete",
  };
}
