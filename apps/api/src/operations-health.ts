export type ReconciliationHealthStatus = "delayed" | "fresh" | "stale" | "unavailable";
export type SchedulerActivationStatus = "blocked" | "disabled" | "ready";
export type MigrationReadinessStatus = "blocked" | "ready";

export interface MigrationReadiness {
  readonly blockedReasons: readonly string[];
  readonly status: MigrationReadinessStatus;
}

export interface MigrationReadinessQueryClient {
  query<T extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<{ readonly rows: readonly T[] }>;
}

export interface ReconciliationHealth {
  readonly ageSeconds?: number;
  readonly capturedAt?: string;
  readonly status: ReconciliationHealthStatus;
}

export const RECONCILIATION_HEALTH_THRESHOLDS = {
  delayedSeconds: 93_600,
  staleSeconds: 172_800,
} as const;

export function assessSchedulerActivation(input: {
  readonly brokerConnectionEnabled: boolean;
  readonly dailyPreparationHandlerEnabled: boolean;
  readonly schedulerEnabled: boolean;
}): SchedulerActivationStatus {
  if (!input.schedulerEnabled) return "disabled";
  return input.brokerConnectionEnabled && input.dailyPreparationHandlerEnabled ? "ready" : "blocked";
}

export function assessAuditMigrationReadiness(input: { readonly auditTablePresent: boolean; readonly requiredColumnsPresent: boolean; readonly schemaMigrationRecorded: boolean }): MigrationReadiness {
  const blockedReasons = [
    ...(input.schemaMigrationRecorded ? [] : ["migration_not_recorded"]),
    ...(input.auditTablePresent ? [] : ["audit_table_missing"]),
    ...(input.requiredColumnsPresent ? [] : ["audit_columns_missing"]),
  ];
  return { blockedReasons, status: blockedReasons.length === 0 ? "ready" : "blocked" };
}

export async function readAuditMigrationReadiness(client: MigrationReadinessQueryClient): Promise<MigrationReadiness> {
  let schemaMigrationRecorded = false;
  try {
    const recorded = await client.query<{ readonly recorded: boolean }>("SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1) AS recorded", ["0009"]);
    schemaMigrationRecorded = recorded.rows[0]?.recorded === true;
  } catch (error) {
    if ((error as { readonly code?: string }).code !== "42P01") throw error;
  }
  const table = await client.query<{ readonly present: boolean }>("SELECT to_regclass('public.durable_one_run_audits') IS NOT NULL AS present");
  const columns = await client.query<{ readonly count: number }>("SELECT COUNT(*)::int AS count FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'durable_one_run_audits' AND column_name = ANY($1::text[])", [["run_id", "approval_reference", "account_snapshot_id", "captured_at", "created_at", "status"]]);
  return assessAuditMigrationReadiness({ auditTablePresent: table.rows[0]?.present === true, requiredColumnsPresent: Number(columns.rows[0]?.count ?? 0) === 6, schemaMigrationRecorded });
}

export function assessReconciliationHealth(
  capturedAt: Date | string | undefined,
  now = new Date(),
  thresholds = RECONCILIATION_HEALTH_THRESHOLDS,
): ReconciliationHealth {
  if (!capturedAt) return { status: "unavailable" };

  const captured = capturedAt instanceof Date ? capturedAt : new Date(capturedAt);
  if (Number.isNaN(captured.getTime())) return { status: "unavailable" };

  const ageSeconds = Math.max(0, Math.floor((now.getTime() - captured.getTime()) / 1000));
  const status = ageSeconds > thresholds.staleSeconds
    ? "stale"
    : ageSeconds > thresholds.delayedSeconds
      ? "delayed"
      : "fresh";
  return { ageSeconds, capturedAt: captured.toISOString(), status };
}
