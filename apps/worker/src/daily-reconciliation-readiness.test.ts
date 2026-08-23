import { describe, expect, it } from "vitest";

import { combineDailyReconciliationReadiness } from "./daily-reconciliation-readiness.js";

const migration = { blockedReasons: [], checks: { auditTablePresent: true, migrationFilePresent: true, requiredColumnsPresent: true, schemaMigrationRecorded: true }, status: "ready" as const };
const scheduler = { blockedReasons: [], checks: { brokerConnectionEnabled: true, dailyPreparationHandlerEnabled: true, databaseConfigured: true, paperCredentialsConfigured: true, paperMode: true, schedulerEnabled: false }, status: "disabled" as const };

describe("daily reconciliation readiness", () => {
  it("reports disabled when structural prerequisites are ready but scheduler is off", () => {
    expect(combineDailyReconciliationReadiness({ migration, scheduler })).toMatchObject({ blockedReasons: [], status: "disabled" });
  });

  it("blocks migration gaps even while the scheduler is disabled", () => {
    const result = combineDailyReconciliationReadiness({ migration: { ...migration, blockedReasons: ["audit_table_missing"], status: "blocked" }, scheduler });
    expect(result).toMatchObject({ blockedReasons: ["migration_audit_table_missing"], status: "blocked" });
  });

  it("does not duplicate the migration prefix in reason codes", () => {
    const result = combineDailyReconciliationReadiness({ migration: { ...migration, blockedReasons: ["migration_not_recorded"], status: "blocked" }, scheduler });
    expect(result.blockedReasons).toEqual(["migration_not_recorded"]);
  });
});
