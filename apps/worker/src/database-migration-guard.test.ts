import { describe, expect, it } from "vitest";

import { migrationRequiresApproval, validateDatabaseMigrationApprovalReference } from "./database-migration-guard.js";

describe("database migration approval guard", () => {
  it("requires a bounded non-secret reference", () => {
    expect(() => validateDatabaseMigrationApprovalReference({})).toThrow("DATABASE_MIGRATION_APPROVAL_REFERENCE");
    expect(() => validateDatabaseMigrationApprovalReference({ DATABASE_MIGRATION_APPROVAL_REFERENCE: "bad value" })).toThrow("bounded");
    expect(validateDatabaseMigrationApprovalReference({ DATABASE_MIGRATION_APPROVAL_REFERENCE: "change-123" })).toBe("change-123");
  });

  it("only gates the reviewed one-run audit migration", () => {
    expect(migrationRequiresApproval("0008")).toBe(false);
    expect(migrationRequiresApproval("0009")).toBe(true);
  });
});
