export type ReconciliationHealthStatus = "delayed" | "fresh" | "stale" | "unavailable";
export type SchedulerActivationStatus = "blocked" | "disabled" | "ready";
export type ResearchScheduleActivationStatus = "blocked" | "disabled" | "ready";
export type MigrationReadinessStatus = "blocked" | "ready";
export type MigrationBlockedReason = "audit_columns_missing" | "audit_table_missing" | "migration_not_recorded";
export type DurableScheduleRunHealthStatus = "completed" | "failed" | "running" | "unavailable";
export type SchedulerAuditGateStatus = "blocked" | "disabled" | "enabled";

export interface SchedulerAuditGate {
  readonly activationApprovalReferencePresent: boolean;
  readonly enabled: boolean;
  readonly migrationReady: boolean;
  readonly status: SchedulerAuditGateStatus;
}

export function assessSchedulerAuditGate(input: { readonly activationApprovalReferencePresent: boolean; readonly enabled: boolean; readonly migrationReady: boolean }): SchedulerAuditGate {
  const status: SchedulerAuditGateStatus = !input.enabled ? "disabled" : input.activationApprovalReferencePresent && input.migrationReady ? "enabled" : "blocked";
  return { ...input, status };
}

export interface DurableScheduleRunHealthInput {
  readonly completedAt?: Date | null;
  readonly failureCode?: string | null;
  readonly runId: string;
  readonly scheduledAt: Date;
  readonly startedAt: Date;
  readonly status: string;
}

export interface DurableScheduleRunHealth {
  readonly completedAt?: string;
  readonly failureCode?: string;
  readonly runId?: string;
  readonly scheduledAt?: string;
  readonly startedAt?: string;
  readonly status: DurableScheduleRunHealthStatus;
}

export function serializeDurableScheduleRunHealth(run: DurableScheduleRunHealthInput | undefined): DurableScheduleRunHealth {
  if (!run) return { status: "unavailable" };
  if (!( ["completed", "failed", "running"] as const).includes(run.status as "completed" | "failed" | "running")) return { status: "unavailable" };
  return {
    ...(run.completedAt ? { completedAt: run.completedAt.toISOString() } : {}),
    ...(run.failureCode ? { failureCode: run.failureCode } : {}),
    runId: run.runId,
    scheduledAt: run.scheduledAt.toISOString(),
    startedAt: run.startedAt.toISOString(),
    status: run.status as DurableScheduleRunHealthStatus,
  };
}

export interface MigrationReadiness {
  readonly blockedReasons: readonly MigrationBlockedReason[];
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

export interface RiskCycleSummary {
  readonly approved: number;
  readonly decisions: number;
  readonly latestAt?: string;
}

/** Serialize only bounded, durable risk-cycle counters for operator surfaces. */
export function serializeRiskCycleSummary(row: { readonly approved?: unknown; readonly decisions?: unknown; readonly latestAt?: unknown; readonly latest_at?: unknown } | undefined): RiskCycleSummary {
  const approved = Number.isSafeInteger(Number(row?.approved)) && Number(row?.approved) >= 0 ? Number(row?.approved) : 0;
  const decisions = Number.isSafeInteger(Number(row?.decisions)) && Number(row?.decisions) >= 0 ? Number(row?.decisions) : 0;
  const latest = row?.latestAt ?? row?.latest_at;
  const latestAt = latest instanceof Date ? latest.toISOString() : typeof latest === "string" && Number.isFinite(Date.parse(latest)) ? new Date(latest).toISOString() : undefined;
  return { approved: Math.min(100_000, approved), decisions: Math.min(100_000, decisions), ...(latestAt ? { latestAt } : {}) };
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

export function assessResearchScheduleActivation(input: {
  readonly brokerConnectionEnabled: boolean;
  readonly databaseConfigured: boolean;
  readonly handlerEnabled: boolean;
  readonly paperCredentialsConfigured: boolean;
  readonly paperMode: boolean;
  readonly schedulerEnabled: boolean;
}): ResearchScheduleActivationStatus {
  if (!input.schedulerEnabled) return "disabled";
  return input.brokerConnectionEnabled && input.databaseConfigured && input.handlerEnabled && input.paperCredentialsConfigured && input.paperMode ? "ready" : "blocked";
}

export function assessAuditMigrationReadiness(input: { readonly auditTablePresent: boolean; readonly requiredColumnsPresent: boolean; readonly schemaMigrationRecorded: boolean }): MigrationReadiness {
  const blockedReasons: MigrationBlockedReason[] = [
    ...(input.schemaMigrationRecorded ? [] : ["migration_not_recorded" as const]),
    ...(input.auditTablePresent ? [] : ["audit_table_missing" as const]),
    ...(input.requiredColumnsPresent ? [] : ["audit_columns_missing" as const]),
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

export interface SchedulerAuditMigrationReadiness {
  readonly ready: boolean;
}

export async function readSchedulerAuditMigrationReadiness(client: MigrationReadinessQueryClient): Promise<SchedulerAuditMigrationReadiness> {
  let schemaMigrationRecorded = false;
  try {
    const recorded = await client.query<{ readonly recorded: boolean }>("SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1) AS recorded", ["0010"]);
    schemaMigrationRecorded = recorded.rows[0]?.recorded === true;
  } catch (error) {
    if ((error as { readonly code?: string }).code !== "42P01") throw error;
  }
  const result = await client.query<{ readonly table_present: boolean; readonly required_columns_present: boolean }>("SELECT to_regclass('public.durable_schedule_runs') IS NOT NULL AS table_present, (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'durable_schedule_runs' AND column_name = ANY($1::text[])) = 8 AS required_columns_present", [["run_id", "scheduled_at", "started_at", "completed_at", "account_snapshot_id", "failure_code", "created_at", "status"]]);
  return { ready: schemaMigrationRecorded && result.rows[0]?.table_present === true && result.rows[0]?.required_columns_present === true };
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
