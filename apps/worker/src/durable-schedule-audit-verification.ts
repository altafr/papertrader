import type { DurableQueueInspection } from "./durable-scheduler.js";

export interface DurableScheduleAuditVerification {
  readonly audit: { readonly completedAt?: string; readonly runId?: string; readonly scheduledAt?: string; readonly status: "completed" | "failed" | "running" | "unavailable" };
  readonly blockedReasons: readonly string[];
  readonly cycle: { readonly capturedAt?: string; readonly startedAt?: string; readonly status: "fresh" | "unavailable" };
  readonly queues: DurableQueueInspection;
  readonly status: "incomplete" | "verified";
}

/** Verify the first persisted scheduler-audit evidence without writing or triggering work. */
export function assessDurableScheduleAuditVerification(input: {
  readonly capturedAt?: Date | string;
  readonly cycleStartedAt?: Date | string;
  readonly now?: Date;
  readonly queues: DurableQueueInspection;
  readonly run?: { readonly completedAt?: Date | string; readonly runId: string; readonly scheduledAt: Date | string; readonly status: "completed" | "failed" | "running" };
}): DurableScheduleAuditVerification {
  const started = input.cycleStartedAt instanceof Date ? input.cycleStartedAt : input.cycleStartedAt ? new Date(input.cycleStartedAt) : undefined;
  const captured = input.capturedAt instanceof Date ? input.capturedAt : input.capturedAt ? new Date(input.capturedAt) : undefined;
  const scheduled = input.run ? input.run.scheduledAt instanceof Date ? input.run.scheduledAt : new Date(input.run.scheduledAt) : undefined;
  const validStarted = Boolean(started && !Number.isNaN(started.getTime()));
  const validCaptured = Boolean(captured && !Number.isNaN(captured.getTime()));
  const validScheduled = Boolean(scheduled && !Number.isNaN(scheduled.getTime()));
  const now = input.now ?? new Date();
  const blockedReasons = [
    ...(validStarted ? [] : ["cycle_started_at_invalid"]),
    ...(input.run ? [] : ["scheduler_audit_run_unavailable"]),
    ...(input.run?.status === "completed" || input.run?.status === "failed" ? [] : ["scheduler_audit_run_not_finished"]),
    ...(validScheduled && validStarted && scheduled!.getTime() >= started!.getTime() ? [] : ["scheduler_audit_run_before_cycle"]),
    ...(validCaptured ? [] : ["reconciliation_unavailable"]),
    ...(validCaptured && validStarted && captured!.getTime() >= started!.getTime() ? [] : ["reconciliation_before_cycle"]),
    ...(validCaptured && now.getTime() - captured!.getTime() <= 172_800_000 ? [] : ["reconciliation_stale"]),
    ...(input.queues.workQueue.present && input.queues.deadLetterQueue.present ? [] : ["queues_missing"]),
    ...(input.queues.workQueue.queuedCount === 0 && input.queues.workQueue.activeCount === 0 && input.queues.workQueue.failedCount === 0 ? [] : ["work_queue_not_drained"]),
    ...(input.queues.deadLetterQueue.queuedCount === 0 && input.queues.deadLetterQueue.activeCount === 0 && input.queues.deadLetterQueue.failedCount === 0 ? [] : ["dead_letter_queue_not_empty"]),
  ];
  return {
    audit: { ...(input.run?.completedAt ? { completedAt: new Date(input.run.completedAt).toISOString() } : {}), ...(input.run?.runId ? { runId: input.run.runId } : {}), ...(validScheduled ? { scheduledAt: scheduled!.toISOString() } : {}), status: input.run?.status ?? "unavailable" },
    blockedReasons,
    cycle: { ...(validCaptured ? { capturedAt: captured!.toISOString() } : {}), ...(validStarted ? { startedAt: started!.toISOString() } : {}), status: blockedReasons.some((reason) => ["reconciliation_unavailable", "reconciliation_before_cycle", "reconciliation_stale"].includes(reason)) ? "unavailable" : "fresh" },
    queues: input.queues,
    status: blockedReasons.length === 0 ? "verified" : "incomplete",
  };
}
