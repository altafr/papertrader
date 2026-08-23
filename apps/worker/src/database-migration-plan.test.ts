import { describe, expect, it } from "vitest";

import { buildDatabaseMigrationPlan } from "./database-migration-plan.js";

describe("database migration plan", () => {
  it("lists only unapplied migrations and marks 0009 approval", () => {
    expect(buildDatabaseMigrationPlan({ appliedVersions: new Set(["0008"]), files: ["0008_agent_runs.sql", "0009_durable_one_run_audits.sql"], schemaMigrationsTablePresent: true })).toEqual({ pending: [{ approvalRequired: true, file: "0009_durable_one_run_audits.sql", version: "0009" }], schemaMigrationsTablePresent: true, status: "plan" });
  });

  it("does not infer that an absent tracking table means a write is safe", () => {
    const result = buildDatabaseMigrationPlan({ appliedVersions: new Set(), files: ["0009_durable_one_run_audits.sql"], schemaMigrationsTablePresent: false });
    expect(result).toMatchObject({ pending: [{ approvalRequired: true }], schemaMigrationsTablePresent: false, status: "plan" });
  });
});
