export interface DurableSchedulerMigrationState {
  readonly blockedReasons: readonly string[];
  readonly checks: {
    readonly auditTablePresent: boolean;
    readonly requiredColumnsPresent: boolean;
    readonly schemaMigrationRecorded: boolean;
  };
  readonly ready: boolean;
}

export interface MigrationQueryClient {
  query<T extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<{ readonly rows: readonly T[] }>;
}

export async function readDurableSchedulerMigrationState(client: MigrationQueryClient): Promise<DurableSchedulerMigrationState> {
  let schemaMigrationRecorded = false;
  try {
    const result = await client.query<{ readonly recorded: boolean }>("SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1) AS recorded", ["0009"]);
    schemaMigrationRecorded = result.rows[0]?.recorded === true;
  } catch (error) {
    if ((error as { readonly code?: string }).code !== "42P01") throw error;
  }
  const result = await client.query<{ readonly audit_table_present: boolean; readonly required_columns_present: boolean }>("SELECT to_regclass('public.durable_one_run_audits') IS NOT NULL AS audit_table_present, (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'durable_one_run_audits' AND column_name = ANY($1::text[])) = 6 AS required_columns_present", [["run_id", "approval_reference", "account_snapshot_id", "captured_at", "created_at", "status"]]);
  const auditTablePresent = result.rows[0]?.audit_table_present === true;
  const requiredColumnsPresent = result.rows[0]?.required_columns_present === true;
  const blockedReasons = [
    ...(schemaMigrationRecorded ? [] : ["migration_not_recorded"]),
    ...(auditTablePresent ? [] : ["audit_table_missing"]),
    ...(requiredColumnsPresent ? [] : ["audit_columns_missing"]),
  ];
  return { blockedReasons, checks: { auditTablePresent, requiredColumnsPresent, schemaMigrationRecorded }, ready: blockedReasons.length === 0 };
}

export function assertDurableSchedulerMigrationReady(state: DurableSchedulerMigrationState): void {
  if (!state.ready) throw new Error(`DURABLE_SCHEDULER_ENABLED=true requires migration 0009 readiness: ${state.blockedReasons.join(",")}.`);
}

export interface DurableScheduleRunMigrationState {
  readonly blockedReasons: readonly string[];
  readonly ready: boolean;
}

export async function readDurableScheduleRunMigrationState(client: MigrationQueryClient): Promise<DurableScheduleRunMigrationState> {
  let schemaMigrationRecorded = false;
  try {
    const result = await client.query<{ readonly recorded: boolean }>("SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1) AS recorded", ["0010"]);
    schemaMigrationRecorded = result.rows[0]?.recorded === true;
  } catch (error) {
    if ((error as { readonly code?: string }).code !== "42P01") throw error;
  }
  const result = await client.query<{ readonly table_present: boolean; readonly required_columns_present: boolean }>("SELECT to_regclass('public.durable_schedule_runs') IS NOT NULL AS table_present, (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'durable_schedule_runs' AND column_name = ANY($1::text[])) = 8 AS required_columns_present", [["run_id", "scheduled_at", "started_at", "completed_at", "account_snapshot_id", "failure_code", "created_at", "status"]]);
  const blockedReasons = [
    ...(schemaMigrationRecorded ? [] : ["migration_not_recorded"]),
    ...(result.rows[0]?.table_present ? [] : ["schedule_runs_table_missing"]),
    ...(result.rows[0]?.required_columns_present ? [] : ["schedule_runs_columns_missing"]),
  ];
  return { blockedReasons, ready: blockedReasons.length === 0 };
}

export function assertDurableScheduleRunMigrationReady(state: DurableScheduleRunMigrationState): void {
  if (!state.ready) throw new Error(`DURABLE_SCHEDULER_AUDIT_ENABLED=true requires migration 0010 readiness: ${state.blockedReasons.join(",")}.`);
}
