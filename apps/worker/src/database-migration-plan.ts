import { migrationRequiresApproval } from "./database-migration-guard.js";

export interface DatabaseMigrationPlanItem {
  readonly approvalRequired: boolean;
  readonly file: string;
  readonly version: string;
}

export interface DatabaseMigrationPlan {
  readonly pending: readonly DatabaseMigrationPlanItem[];
  readonly schemaMigrationsTablePresent: boolean;
  readonly status: "plan";
}

export function buildDatabaseMigrationPlan(input: { readonly files: readonly string[]; readonly appliedVersions: ReadonlySet<string>; readonly schemaMigrationsTablePresent: boolean }): DatabaseMigrationPlan {
  const pending = input.files
    .map((file) => ({ file, version: file.split("_", 1)[0] ?? "" }))
    .filter((migration) => migration.version.length > 0 && !input.appliedVersions.has(migration.version))
    .map((migration) => ({ ...migration, approvalRequired: migrationRequiresApproval(migration.version) }));
  return { pending, schemaMigrationsTablePresent: input.schemaMigrationsTablePresent, status: "plan" };
}
