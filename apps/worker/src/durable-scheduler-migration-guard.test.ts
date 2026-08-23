import { describe, expect, it } from "vitest";

import { assertDurableSchedulerMigrationReady, readDurableSchedulerMigrationState } from "./durable-scheduler-migration-guard.js";

describe("durable scheduler migration guard", () => {
  it("fails closed when the audit migration is absent", () => {
    expect(() => assertDurableSchedulerMigrationReady({ blockedReasons: ["migration_not_recorded"], checks: { auditTablePresent: false, requiredColumnsPresent: false, schemaMigrationRecorded: false }, ready: false })).toThrow("migration_not_recorded");
  });

  it("allows startup only for a complete migration contract", () => {
    expect(() => assertDurableSchedulerMigrationReady({ blockedReasons: [], checks: { auditTablePresent: true, requiredColumnsPresent: true, schemaMigrationRecorded: true }, ready: true })).not.toThrow();
  });

  it("reads a complete schema as ready", async () => {
    let call = 0;
    const state = await readDurableSchedulerMigrationState({ query: async <T extends Record<string, unknown>>() => {
      call += 1;
      return { rows: (call === 1 ? [{ recorded: true }] : [{ audit_table_present: true, required_columns_present: true }]) as unknown as T[] };
    } });
    expect(state).toEqual({ blockedReasons: [], checks: { auditTablePresent: true, requiredColumnsPresent: true, schemaMigrationRecorded: true }, ready: true });
  });

  it("fails closed when schema_migrations is absent", async () => {
    let call = 0;
    const state = await readDurableSchedulerMigrationState({ query: async <T extends Record<string, unknown>>() => {
      call += 1;
      if (call === 1) throw Object.assign(new Error("missing"), { code: "42P01" });
      return { rows: [{ audit_table_present: false, required_columns_present: false }] as unknown as T[] };
    } });
    expect(state).toMatchObject({ blockedReasons: ["migration_not_recorded", "audit_table_missing", "audit_columns_missing"], ready: false });
  });
});
