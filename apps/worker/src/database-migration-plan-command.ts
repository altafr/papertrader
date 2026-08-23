import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createDatabase } from "@momentum/db";

import { buildDatabaseMigrationPlan } from "./database-migration-plan.js";

if (process.env.DATABASE_MIGRATION_PLAN !== "true") {
  throw new Error("DATABASE_MIGRATION_PLAN must be exactly true for the read-only migration plan command.");
}

getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for migration planning.");

const candidates = [join(process.cwd(), "packages", "db", "migrations"), join(process.cwd(), "..", "..", "packages", "db", "migrations")];
let directory: string | undefined;
for (const candidate of candidates) {
  try { await readdir(candidate); directory = candidate; break; } catch { /* try next workspace layout */ }
}
if (!directory) throw new Error("Reviewed application migrations were not found in the workspace.");
const files = (await readdir(directory)).filter((file) => /^\d{4}_.+\.sql$/.test(file)).sort();

const { pool } = createDatabase(databaseUrl);
try {
  let schemaMigrationsTablePresent = true;
  let rows: { version: string }[] = [];
  try {
    const result = await pool.query<{ version: string }>("SELECT version FROM schema_migrations");
    rows = result.rows;
  } catch (error) {
    if ((error as { readonly code?: string }).code !== "42P01") throw error;
    schemaMigrationsTablePresent = false;
  }
  const plan = buildDatabaseMigrationPlan({ appliedVersions: new Set(rows.map((row) => row.version)), files, schemaMigrationsTablePresent });
  console.log(JSON.stringify(plan));
} catch {
  console.error("Migration plan failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
