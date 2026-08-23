export function validateDatabaseMigrationApprovalReference(environment: NodeJS.ProcessEnv = process.env): string {
  const reference = environment.DATABASE_MIGRATION_APPROVAL_REFERENCE?.trim();
  if (!reference || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(reference)) {
    throw new Error("DATABASE_MIGRATION_APPROVAL_REFERENCE must be a bounded non-secret reference.");
  }
  return reference;
}

export function migrationRequiresApproval(version: string): boolean {
  return version === "0009";
}

export function validateDatabaseMigrationTarget(version: string, environment: NodeJS.ProcessEnv = process.env): void {
  if (environment.DATABASE_MIGRATION_TARGET !== version) {
    throw new Error(`DATABASE_MIGRATION_TARGET must be exactly ${version} for this pending migration.`);
  }
}
