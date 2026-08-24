import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createDatabase } from "@momentum/db";

import { readDurableScheduleRunMigrationState } from "./durable-scheduler-migration-guard.js";

if (process.env.DURABLE_SCHEDULE_AUDIT_READINESS !== "true") throw new Error("DURABLE_SCHEDULE_AUDIT_READINESS must be exactly true for the guarded scheduler-audit readiness command.");
getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for scheduler-audit readiness.");

const { pool } = createDatabase(databaseUrl);
try {
  const readiness = await readDurableScheduleRunMigrationState(pool);
  console.log(JSON.stringify(readiness));
  if (!readiness.ready) process.exitCode = 1;
} catch {
  console.error("Scheduler-audit migration readiness check failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
