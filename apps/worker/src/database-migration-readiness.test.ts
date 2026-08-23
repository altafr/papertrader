import { describe, expect, it } from "vitest";

import { assessDurableOneRunMigrationReadiness } from "./database-migration-readiness.js";

describe("durable one-run migration readiness", () => {
  it("is ready only when the reviewed migration and database contract are present", () => {
    expect(assessDurableOneRunMigrationReadiness({ auditTablePresent: true, migrationFilePresent: true, requiredColumnsPresent: true, schemaMigrationRecorded: true })).toEqual({ blockedReasons: [], checks: { auditTablePresent: true, migrationFilePresent: true, requiredColumnsPresent: true, schemaMigrationRecorded: true }, status: "ready" });
  });

  it("reports bounded reasons without exposing database values", () => {
    const result = assessDurableOneRunMigrationReadiness({ auditTablePresent: false, migrationFilePresent: true, requiredColumnsPresent: false, schemaMigrationRecorded: false });
    expect(result).toMatchObject({ blockedReasons: ["migration_not_recorded", "audit_table_missing", "audit_columns_missing"], status: "blocked" });
    expect(JSON.stringify(result)).not.toContain("postgres");
  });
});
