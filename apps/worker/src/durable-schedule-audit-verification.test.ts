import { describe, expect, it } from "vitest";

import { assessDurableScheduleAuditVerification } from "./durable-schedule-audit-verification.js";

const queues = { workQueue: { activeCount: 0, failedCount: 0, present: true, queuedCount: 0 }, deadLetterQueue: { activeCount: 0, failedCount: 0, present: true, queuedCount: 0 } };

describe("durable schedule audit verification", () => {
  it("verifies a finished post-cycle run with fresh reconciliation", () => {
    expect(assessDurableScheduleAuditVerification({ capturedAt: "2026-08-26T00:00:40Z", cycleStartedAt: "2026-08-26T00:00:00Z", now: new Date("2026-08-26T00:01:00Z"), queues, run: { completedAt: "2026-08-26T00:00:45Z", runId: "scheduled-daily-preparation-2026-08-26", scheduledAt: "2026-08-26T00:00:00Z", status: "completed" } }).status).toBe("verified");
  });

  it("fails closed before the first run", () => {
    const result = assessDurableScheduleAuditVerification({ capturedAt: "2026-08-25T00:00:32Z", cycleStartedAt: "2026-08-26T00:00:00Z", now: new Date("2026-08-26T00:01:00Z"), queues });
    expect(result.status).toBe("incomplete");
    expect(result.blockedReasons).toContain("scheduler_audit_run_unavailable");
  });
});
