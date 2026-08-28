import { describe, expect, it } from "vitest";

import { assessDurableOneRunVerification } from "./durable-one-run-verification.js";

const queues = { deadLetterQueue: { activeCount: 0, failedCount: 0, present: true, queuedCount: 0 }, workQueue: { activeCount: 0, failedCount: 0, present: true, queuedCount: 0 } } as const;

describe("durable one-run verification", () => {
  it("verifies drained queues and fresh persisted reconciliation", () => {
    expect(assessDurableOneRunVerification({ approvalReference: "ticket-123", persistedProvenance: { approvalReference: "ticket-123", capturedAt: "2026-08-23T00:00:00.000Z", runId: "run-1" }, queues, runId: "run-1", capturedAt: "2026-08-23T00:00:00.000Z", now: new Date("2026-08-23T01:00:00.000Z") })).toMatchObject({ blockedReasons: [], provenance: { approvalReference: "ticket-123", persisted: true, runId: "run-1" }, reconciliation: { status: "fresh" }, status: "verified" });
  });

  it("fails closed when queues or reconciliation are incomplete", () => {
    const result = assessDurableOneRunVerification({ queues: { ...queues, workQueue: { ...queues.workQueue, queuedCount: 1 }, deadLetterQueue: { ...queues.deadLetterQueue, queuedCount: 1 } }, now: new Date("2026-08-23T01:00:00.000Z") });
    expect(result.status).toBe("incomplete");
    expect(result.blockedReasons).toEqual(expect.arrayContaining(["work_queue_not_drained", "dead_letter_queue_not_empty", "reconciliation_unavailable", "provenance_audit_missing"]));
  });

  it("rejects stale reconciliation even when queues are drained", () => {
    expect(assessDurableOneRunVerification({ queues, capturedAt: "2026-08-20T00:00:00.000Z", now: new Date("2026-08-23T00:00:00.000Z") }).blockedReasons).toContain("reconciliation_stale");
  });
});
