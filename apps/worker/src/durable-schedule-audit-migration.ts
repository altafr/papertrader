import { validateDatabaseMigrationApprovalReference } from "./database-migration-guard.js";

export function validateDurableScheduleAuditMigration(environment: NodeJS.ProcessEnv = process.env): string {
  if (environment.DURABLE_SCHEDULE_AUDIT_MIGRATE !== "true") throw new Error("DURABLE_SCHEDULE_AUDIT_MIGRATE must be exactly true for migration 0010.");
  if (environment.DATABASE_MIGRATION_TARGET !== "0010") throw new Error("DATABASE_MIGRATION_TARGET must be exactly 0010 for the scheduler-audit migration.");
  return validateDatabaseMigrationApprovalReference(environment);
}

export function assertOnlySchedulerAuditMigrationPending(pendingVersions: readonly string[]): void {
  const unexpected = pendingVersions.filter((version) => version !== "0010");
  if (unexpected.length > 0) throw new Error(`Only migration 0010 may be applied by this command; unexpected pending versions: ${unexpected.join(",")}.`);
  if (!pendingVersions.includes("0010")) throw new Error("Migration 0010 is already applied or was not found as pending.");
}
