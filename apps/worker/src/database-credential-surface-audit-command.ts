import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createDatabase } from "@momentum/db";

import { CREDENTIAL_SURFACE_PATTERN, summarizeCredentialSurfaceAudit } from "./database-credential-surface-audit.js";

if (process.env.DATABASE_CREDENTIAL_SURFACE_AUDIT !== "true") throw new Error("DATABASE_CREDENTIAL_SURFACE_AUDIT must be exactly true for the guarded credential-surface audit command.");
getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for the credential-surface audit.");

const quoteIdentifier = (value: string): string => `"${value.replaceAll('"', '""')}"`;
const { pool } = createDatabase(databaseUrl);
try {
  const columns = await pool.query<{ readonly table_name: string; readonly column_name: string }>("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = $1 AND data_type IN ($2, $3)", ["public", "text", "character varying"]);
  let matchingColumns = 0;
  let matchingRows = 0;
  for (const column of columns.rows) {
    const result = await pool.query<{ readonly matches: number }>(`SELECT count(*)::int AS matches FROM ${quoteIdentifier(column.table_name)} WHERE ${quoteIdentifier(column.column_name)}::text ~* $1`, [CREDENTIAL_SURFACE_PATTERN]);
    const matches = Number(result.rows[0]?.matches ?? 0);
    if (matches > 0) {
      matchingColumns += 1;
      matchingRows += matches;
    }
  }
  const summary = summarizeCredentialSurfaceAudit({ columnsScanned: columns.rows.length, matchingColumns, matchingRows });
  console.log(JSON.stringify(summary));
  if (summary.status !== "passed") process.exitCode = 1;
} catch {
  console.error("Database credential-surface audit failed.");
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => undefined);
}
