import { access, readdir } from "node:fs/promises";
import { join } from "node:path";

import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createDatabase } from "@momentum/db";

import { getDurableSchedulerReadiness } from "./durable-scheduler.js";
import { assessDurableOneRunMigrationReadiness } from "./database-migration-readiness.js";
import { combineDailyReconciliationReadiness, getDailyReconciliationActivationSchedulerReadiness } from "./daily-reconciliation-readiness.js";

if (process.env.DAILY_RECONCILIATION_READINESS !== "true") throw new Error("DAILY_RECONCILIATION_READINESS must be exactly true for the guarded readiness command.");
getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for daily reconciliation readiness.");

const candidates = [join(process.cwd(), "packages", "db", "migrations"), join(process.cwd(), "..", "..", "packages", "db", "migrations")];
let directory: string | undefined;
for (const candidate of candidates) { try { await readdir(candidate); directory = candidate; break; } catch { /* try next workspace layout */ } }
if (!directory) throw new Error("Reviewed application migrations were not found in the workspace.");
const migrationFilePresent = await access(join(directory, "0009_durable_one_run_audits.sql")).then(() => true).catch(() => false);

const { pool } = createDatabase(databaseUrl);
try {
  const recorded = await pool.query("SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1) AS recorded", ["0009"]);
  const table = await pool.query("SELECT to_regclass('public.durable_one_run_audits') IS NOT NULL AS present");
  const columns = await pool.query("SELECT COUNT(*)::int AS count FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'durable_one_run_audits' AND column_name = ANY($1::text[])", [["run_id", "approval_reference", "account_snapshot_id", "captured_at", "created_at", "status"]]);
  const migration = assessDurableOneRunMigrationReadiness({ auditTablePresent: table.rows[0]?.present === true, migrationFilePresent, requiredColumnsPresent: Number(columns.rows[0]?.count ?? 0) === 6, schemaMigrationRecorded: recorded.rows[0]?.recorded === true });
  const scheduler = process.env.DAILY_RECONCILIATION_ACTIVATION_PREFLIGHT === "true"
    ? getDailyReconciliationActivationSchedulerReadiness()
    : getDurableSchedulerReadiness();
  const readiness = combineDailyReconciliationReadiness({ migration, scheduler });
  console.log(JSON.stringify(readiness));
  if (readiness.status === "blocked") process.exitCode = 1;
} catch {
  console.error("Daily reconciliation readiness check failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
