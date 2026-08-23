export interface DatabaseMigrationReadiness {
  readonly blockedReasons: readonly string[];
  readonly checks: {
    readonly auditTablePresent: boolean;
    readonly migrationFilePresent: boolean;
    readonly requiredColumnsPresent: boolean;
    readonly schemaMigrationRecorded: boolean;
  };
  readonly status: "blocked" | "ready";
}

export function assessDurableOneRunMigrationReadiness(input: DatabaseMigrationReadiness["checks"]): DatabaseMigrationReadiness {
  const blockedReasons = [
    ...(input.migrationFilePresent ? [] : ["migration_file_missing"]),
    ...(input.schemaMigrationRecorded ? [] : ["migration_not_recorded"]),
    ...(input.auditTablePresent ? [] : ["audit_table_missing"]),
    ...(input.requiredColumnsPresent ? [] : ["audit_columns_missing"]),
  ];
  return { blockedReasons, checks: input, status: blockedReasons.length === 0 ? "ready" : "blocked" };
}
