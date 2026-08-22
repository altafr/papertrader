import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

export type Database = NodePgDatabase<typeof schema>;

export function createDatabase(databaseUrl = process.env.DATABASE_URL): {
  db: Database;
  pool: Pool;
} {
  if (!databaseUrl?.trim()) {
    throw new Error("DATABASE_URL is required to create the PostgreSQL client.");
  }
  const pool = new Pool({ connectionString: databaseUrl });
  return { db: drizzle(pool, { schema }), pool };
}
