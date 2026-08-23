import { access } from "node:fs/promises";
import { join } from "node:path";

import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createDatabase } from "@momentum/db";

import { assessDurableOneRunMigrationReadiness } from "./database-migration-readiness.js";

if (process.env.DATABASE_MIGRATION_READINESS !== "true") {
  throw new Error("DATABASE_MIGRATION_READINESS must be exactly true for the guarded migration-readiness command.");
}

getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for migration readiness.");

const migrationCandidates = [join(process.cwd(), "packages", "db", "migrations", "0009_durable_one_run_audits.sql"), join(process.cwd(), "..", "..", "packages", "db", "migrations", "0009_durable_one_run_audits.sql")];
let migrationFilePresent = false;
for (const candidate of migrationCandidates) {
  try { await access(candidate); migrationFilePresent = true; break; } catch { /* try next workspace layout */ }
}

const { pool } = createDatabase(databaseUrl);
try {
  const recorded = await pool.query("SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1) AS recorded", ["0009"]);
  const table = await pool.query("SELECT to_regclass('public.durable_one_run_audits') IS NOT NULL AS present");
  const columns = await pool.query("SELECT COUNT(*)::int AS count FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'durable_one_run_audits' AND column_name = ANY($1::text[])", [["run_id", "approval_reference", "account_snapshot_id", "captured_at", "created_at", "status"]]);
  const readiness = assessDurableOneRunMigrationReadiness({ auditTablePresent: table.rows[0]?.present === true, migrationFilePresent, requiredColumnsPresent: Number(columns.rows[0]?.count ?? 0) === 6, schemaMigrationRecorded: recorded.rows[0]?.recorded === true });
  console.log(JSON.stringify(readiness));
  if (readiness.status === "blocked") process.exitCode = 1;
} catch {
  console.error("Migration readiness check failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
