import type { DurableQueueInspection } from "./durable-scheduler.js";

export interface DurableOneRunVerification {
  readonly blockedReasons: readonly string[];
  readonly queues: DurableQueueInspection;
  readonly provenance: { readonly approvalReference: string; readonly capturedAt?: string; readonly persisted: boolean; readonly runId: string };
  readonly reconciliation: {
    readonly ageSeconds?: number;
    readonly capturedAt?: string;
    readonly status: "fresh" | "stale" | "unavailable";
  };
  readonly status: "incomplete" | "verified";
}

export function assessDurableOneRunVerification(input: { readonly queues: DurableQueueInspection; readonly capturedAt?: Date | string; readonly now?: Date; readonly approvalReference?: string; readonly runId?: string; readonly persistedProvenance?: { readonly approvalReference: string; readonly capturedAt?: Date | string; readonly runId: string } }): DurableOneRunVerification {
  const now = input.now ?? new Date();
  const captured = input.capturedAt instanceof Date ? input.capturedAt : input.capturedAt ? new Date(input.capturedAt) : undefined;
  const validCapture = captured && !Number.isNaN(captured.getTime());
  const ageSeconds = validCapture ? Math.max(0, Math.floor((now.getTime() - captured.getTime()) / 1000)) : undefined;
  const reconciliationStatus = ageSeconds === undefined ? "unavailable" : ageSeconds > 172_800 ? "stale" : "fresh";
  const persistedCapture = input.persistedProvenance?.capturedAt instanceof Date ? input.persistedProvenance.capturedAt : input.persistedProvenance?.capturedAt ? new Date(input.persistedProvenance.capturedAt) : undefined;
  const validPersistedCapture = persistedCapture && !Number.isNaN(persistedCapture.getTime());
  const blockedReasons = [
    ...(input.runId ? [] : ["run_id_missing"]),
    ...(input.approvalReference ? [] : ["approval_reference_missing"]),
    ...(input.persistedProvenance ? [] : ["provenance_audit_missing"]),
    ...(input.persistedProvenance && input.persistedProvenance.runId === input.runId ? [] : ["provenance_run_id_mismatch"]),
    ...(input.persistedProvenance && input.persistedProvenance.approvalReference === input.approvalReference ? [] : ["provenance_approval_reference_mismatch"]),
    ...(input.queues.workQueue.present && input.queues.deadLetterQueue.present ? [] : ["queues_missing"]),
    ...(input.queues.workQueue.queuedCount === 0 && input.queues.workQueue.activeCount === 0 ? [] : ["work_queue_not_drained"]),
    ...(input.queues.deadLetterQueue.queuedCount === 0 && input.queues.deadLetterQueue.activeCount === 0 ? [] : ["dead_letter_queue_not_empty"]),
    ...(reconciliationStatus === "fresh" ? [] : [`reconciliation_${reconciliationStatus}`]),
  ];
  return {
    blockedReasons,
    queues: input.queues,
    provenance: { approvalReference: input.approvalReference ?? "", ...(validPersistedCapture ? { capturedAt: persistedCapture.toISOString() } : {}), persisted: Boolean(input.persistedProvenance), runId: input.runId ?? "" },
    reconciliation: { ...(ageSeconds !== undefined ? { ageSeconds } : {}), ...(validCapture ? { capturedAt: captured.toISOString() } : {}), status: reconciliationStatus },
    status: blockedReasons.length === 0 ? "verified" : "incomplete",
  };
}
