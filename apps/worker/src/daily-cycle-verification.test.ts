import { describe, expect, it } from "vitest";

import { assessDailyCycleVerification } from "./daily-cycle-verification.js";

const queues = { deadLetterQueue: { activeCount: 0, failedCount: 0, present: true, queuedCount: 0 }, workQueue: { activeCount: 0, failedCount: 0, present: true, queuedCount: 0 } } as const;

describe("daily cycle verification", () => {
  it("verifies a fresh reconciliation captured after the cycle began", () => {
    expect(assessDailyCycleVerification({ cycleStartedAt: "2026-08-25T00:00:00.000Z", capturedAt: "2026-08-25T00:01:00.000Z", now: new Date("2026-08-25T01:00:00.000Z"), queues })).toMatchObject({ cycle: { status: "fresh" }, status: "verified" });
  });

  it("rejects a capture from before the cycle", () => {
    expect(assessDailyCycleVerification({ cycleStartedAt: "2026-08-25T00:00:00.000Z", capturedAt: "2026-08-24T23:59:00.000Z", now: new Date("2026-08-25T01:00:00.000Z"), queues })).toMatchObject({ blockedReasons: expect.arrayContaining(["reconciliation_before_cycle"]), status: "incomplete" });
  });

  it("fails closed when queues are not drained", () => {
    expect(assessDailyCycleVerification({ cycleStartedAt: "2026-08-25T00:00:00.000Z", capturedAt: "2026-08-25T00:01:00.000Z", now: new Date("2026-08-25T01:00:00.000Z"), queues: { ...queues, workQueue: { ...queues.workQueue, activeCount: 1 } } })).toMatchObject({ blockedReasons: expect.arrayContaining(["work_queue_not_drained"]), status: "incomplete" });
  });
});
