import { createDatabase } from "@momentum/db";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";

import { verifyDatabaseConnectivity } from "./database-status.js";

if (process.env.DATABASE_STATUS !== "true") {
  throw new Error("DATABASE_STATUS must be exactly true for the guarded database status command.");
}

getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for database status.");

const { pool } = createDatabase(databaseUrl);
try {
  await verifyDatabaseConnectivity({ query: () => pool.query("SELECT 1 AS ok") });
  console.log(JSON.stringify({ databaseReachable: true }));
} catch {
  console.error("Database connectivity check failed.");
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => undefined);
}
