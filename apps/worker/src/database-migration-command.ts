import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createDatabase } from "@momentum/db";

import { validatePendingMigrationSet } from "./database-migration-guard.js";

if (process.env.DATABASE_MIGRATE !== "true") {
  throw new Error("DATABASE_MIGRATE must be exactly true for the guarded application migration command.");
}

getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for application migrations.");

const migrationDirectoryCandidates = [
  join(process.cwd(), "packages", "db", "migrations"),
  join(process.cwd(), "..", "..", "packages", "db", "migrations"),
];
let migrationDirectory: string | undefined;
for (const candidate of migrationDirectoryCandidates) {
  try {
    await readdir(candidate);
    migrationDirectory = candidate;
    break;
  } catch {
    // Try the next known workspace layout.
  }
}
if (!migrationDirectory) throw new Error("Reviewed application migrations were not found in the workspace.");
const migrationFiles = (await readdir(migrationDirectory)).filter((file) => /^\d{4}_.+\.sql$/.test(file)).sort();
if (migrationFiles.length === 0) throw new Error("No reviewed application migrations were found.");
const migrationVersions = migrationFiles.map((file) => {
  const [version] = file.split("_", 1);
  if (!version) throw new Error(`Migration filename has no version: ${file}`);
  return { file, version };
});

const { pool } = createDatabase(databaseUrl);
try {
  const trackingTable = await pool.query<{ readonly present: boolean }>("SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present");
  const applied = trackingTable.rows[0]?.present === true ? new Set((await pool.query<{ readonly version: string }>("SELECT version FROM schema_migrations")).rows.map((row) => row.version)) : new Set<string>();
  const targetVersion = process.env.DATABASE_MIGRATION_TARGET?.trim() || "0009";
  validatePendingMigrationSet(migrationVersions.filter(({ version }) => !applied.has(version)).map(({ version }) => version), targetVersion);
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  for (const { file, version } of migrationVersions) {
    const existing = await pool.query("SELECT 1 FROM schema_migrations WHERE version = $1", [version]);
    if (existing.rowCount) continue;
    const sql = await readFile(join(migrationDirectory, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  console.log(JSON.stringify({ appliedThrough: migrationFiles.at(-1)?.slice(0, 4), migrationCount: migrationFiles.length }));
} catch {
  console.error("Application migration failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
