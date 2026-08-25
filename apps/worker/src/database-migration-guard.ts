export function validateDatabaseMigrationApprovalReference(environment: NodeJS.ProcessEnv = process.env): string {
  const reference = environment.DATABASE_MIGRATION_APPROVAL_REFERENCE?.trim();
  if (!reference || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(reference)) {
    throw new Error("DATABASE_MIGRATION_APPROVAL_REFERENCE must be a bounded non-secret reference.");
  }
  return reference;
}

export function migrationRequiresApproval(version: string): boolean {
  return version === "0009" || version === "0010" || version === "0011" || version === "0012";
}

export function validateDatabaseMigrationTarget(version: string, environment: NodeJS.ProcessEnv = process.env): void {
  if (environment.DATABASE_MIGRATION_TARGET !== version) {
    throw new Error(`DATABASE_MIGRATION_TARGET must be exactly ${version} for this pending migration.`);
  }
}

export function validatePendingMigrationSet(pendingVersions: readonly string[], targetVersion: string, environment: NodeJS.ProcessEnv = process.env): void {
  if (pendingVersions.length === 0) return;
  const unexpectedVersions = pendingVersions.filter((version) => version !== targetVersion);
  if (unexpectedVersions.length > 0) throw new Error(`Only migration ${targetVersion} may be applied by this guarded command; unexpected pending versions: ${unexpectedVersions.join(",")}.`);
  validateDatabaseMigrationTarget(targetVersion, environment);
  if (migrationRequiresApproval(targetVersion)) validateDatabaseMigrationApprovalReference(environment);
}
