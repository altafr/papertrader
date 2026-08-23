import { describe, expect, it } from "vitest";

import { assertDurableSchedulerMigrationReady } from "./durable-scheduler-migration-guard.js";

describe("durable scheduler migration guard", () => {
  it("fails closed when the audit migration is absent", () => {
    expect(() => assertDurableSchedulerMigrationReady({ blockedReasons: ["migration_not_recorded"], checks: { auditTablePresent: false, requiredColumnsPresent: false, schemaMigrationRecorded: false }, ready: false })).toThrow("migration_not_recorded");
  });

  it("allows startup only for a complete migration contract", () => {
    expect(() => assertDurableSchedulerMigrationReady({ blockedReasons: [], checks: { auditTablePresent: true, requiredColumnsPresent: true, schemaMigrationRecorded: true }, ready: true })).not.toThrow();
  });
});
