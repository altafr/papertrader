import { describe, expect, it } from "vitest";

import { assertOnlySchedulerAuditMigrationPending, validateDurableScheduleAuditMigration } from "./durable-schedule-audit-migration.js";

describe("scheduler-audit migration guard", () => {
  it("requires the explicit gate, target, and bounded approval reference", () => {
    expect(() => validateDurableScheduleAuditMigration({})).toThrow("DURABLE_SCHEDULE_AUDIT_MIGRATE");
    expect(() => validateDurableScheduleAuditMigration({ DURABLE_SCHEDULE_AUDIT_MIGRATE: "true", DATABASE_MIGRATION_TARGET: "0009", DATABASE_MIGRATION_APPROVAL_REFERENCE: "ticket-0010" })).toThrow("exactly 0010");
    expect(validateDurableScheduleAuditMigration({ DURABLE_SCHEDULE_AUDIT_MIGRATE: "true", DATABASE_MIGRATION_TARGET: "0010", DATABASE_MIGRATION_APPROVAL_REFERENCE: "ticket-0010" })).toBe("ticket-0010");
  });

  it("allows only 0010 as the pending migration", () => {
    expect(() => assertOnlySchedulerAuditMigrationPending(["0010"])).not.toThrow();
    expect(() => assertOnlySchedulerAuditMigrationPending(["0009", "0010"])).toThrow("unexpected pending versions");
    expect(() => assertOnlySchedulerAuditMigrationPending([])).toThrow("already applied");
  });
});
