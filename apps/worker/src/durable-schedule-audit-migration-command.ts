import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createDatabase } from "@momentum/db";

import { assertOnlySchedulerAuditMigrationPending, validateDurableScheduleAuditMigration } from "./durable-schedule-audit-migration.js";

const approvalReference = validateDurableScheduleAuditMigration();
getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for migration 0010.");

const candidates = [join(process.cwd(), "packages", "db", "migrations"), join(process.cwd(), "..", "..", "packages", "db", "migrations")];
let directory: string | undefined;
for (const candidate of candidates) {
  try { await readdir(candidate); directory = candidate; break; } catch { /* try next workspace layout */ }
}
if (!directory) throw new Error("Reviewed application migrations were not found in the workspace.");
const file = "0010_durable_schedule_runs.sql";
const sql = await readFile(join(directory, file), "utf8");
const { pool } = createDatabase(databaseUrl);
try {
  const tracking = await pool.query<{ readonly version: string }>("SELECT version FROM schema_migrations");
  const applied = new Set(tracking.rows.map((row) => row.version));
  assertOnlySchedulerAuditMigrationPending(applied.has("0010") ? [] : ["0010"]);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", ["0010"]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  console.log(JSON.stringify({ appliedVersion: "0010", approvalRecorded: Boolean(approvalReference) }));
} catch {
  console.error("Scheduler-audit migration failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
