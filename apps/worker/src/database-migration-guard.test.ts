import { describe, expect, it } from "vitest";

import { migrationRequiresApproval, validateDatabaseMigrationApprovalReference, validateDatabaseMigrationTarget, validatePendingMigrationSet } from "./database-migration-guard.js";

describe("database migration approval guard", () => {
  it("requires a bounded non-secret reference", () => {
    expect(() => validateDatabaseMigrationApprovalReference({})).toThrow("DATABASE_MIGRATION_APPROVAL_REFERENCE");
    expect(() => validateDatabaseMigrationApprovalReference({ DATABASE_MIGRATION_APPROVAL_REFERENCE: "bad value" })).toThrow("bounded");
    expect(validateDatabaseMigrationApprovalReference({ DATABASE_MIGRATION_APPROVAL_REFERENCE: "change-123" })).toBe("change-123");
  });

  it("only gates the reviewed one-run audit migration", () => {
    expect(migrationRequiresApproval("0008")).toBe(false);
    expect(migrationRequiresApproval("0009")).toBe(true);
    expect(migrationRequiresApproval("0011")).toBe(true);
  });

  it("requires an exact target for the pending migration", () => {
    expect(() => validateDatabaseMigrationTarget("0009", {})).toThrow("DATABASE_MIGRATION_TARGET");
    expect(() => validateDatabaseMigrationTarget("0009", { DATABASE_MIGRATION_TARGET: "0008" })).toThrow("0009");
    expect(() => validateDatabaseMigrationTarget("0009", { DATABASE_MIGRATION_TARGET: "0009" })).not.toThrow();
  });

  it("rejects unrelated pending migrations before any migration can run", () => {
    expect(() => validatePendingMigrationSet(["0008", "0009"], "0009", { DATABASE_MIGRATION_TARGET: "0009", DATABASE_MIGRATION_APPROVAL_REFERENCE: "change-123" })).toThrow("unexpected pending versions: 0008");
    expect(() => validatePendingMigrationSet(["0009"], "0009", {})).toThrow("DATABASE_MIGRATION_TARGET");
    expect(() => validatePendingMigrationSet([], "0009", {})).not.toThrow();
  });
});
