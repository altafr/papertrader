import type { DurableQueueInspection } from "./durable-scheduler.js";

export interface DailyCycleVerification {
  readonly blockedReasons: readonly string[];
  readonly cycle: { readonly capturedAt?: string; readonly startedAt?: string; readonly status: "fresh" | "unavailable" };
  readonly queues: DurableQueueInspection;
  readonly status: "incomplete" | "verified";
}

/** Verify persisted evidence after a recurring cycle without contacting Alpaca or writing state. */
export function assessDailyCycleVerification(input: {
  readonly capturedAt?: Date | string;
  readonly cycleStartedAt?: Date | string;
  readonly now?: Date;
  readonly queues: DurableQueueInspection;
}): DailyCycleVerification {
  const started = input.cycleStartedAt instanceof Date ? input.cycleStartedAt : input.cycleStartedAt ? new Date(input.cycleStartedAt) : undefined;
  const captured = input.capturedAt instanceof Date ? input.capturedAt : input.capturedAt ? new Date(input.capturedAt) : undefined;
  const validStarted = Boolean(started && !Number.isNaN(started.getTime()));
  const validCaptured = Boolean(captured && !Number.isNaN(captured.getTime()));
  const now = input.now ?? new Date();
  const blockedReasons = [
    ...(validStarted ? [] : ["cycle_started_at_invalid"]),
    ...(validCaptured ? [] : ["reconciliation_unavailable"]),
    ...(validStarted && validCaptured && captured!.getTime() >= started!.getTime() ? [] : ["reconciliation_before_cycle"]),
    ...(validCaptured && now.getTime() - captured!.getTime() <= 172_800_000 ? [] : ["reconciliation_stale"]),
    ...(input.queues.workQueue.present && input.queues.deadLetterQueue.present ? [] : ["queues_missing"]),
    // Failed counts include retained historical rows. Only queued/active jobs
    // represent work that can interfere with a cycle.
    ...(input.queues.workQueue.queuedCount === 0 && input.queues.workQueue.activeCount === 0 ? [] : ["work_queue_not_drained"]),
    ...(input.queues.deadLetterQueue.queuedCount === 0 && input.queues.deadLetterQueue.activeCount === 0 ? [] : ["dead_letter_queue_not_empty"]),
  ];
  return {
    blockedReasons,
    cycle: {
      ...(validCaptured ? { capturedAt: captured!.toISOString() } : {}),
      ...(validStarted ? { startedAt: started!.toISOString() } : {}),
      status: blockedReasons.includes("reconciliation_unavailable") || blockedReasons.includes("reconciliation_before_cycle") || blockedReasons.includes("reconciliation_stale") ? "unavailable" : "fresh",
    },
    queues: input.queues,
    status: blockedReasons.length === 0 ? "verified" : "incomplete",
  };
}
