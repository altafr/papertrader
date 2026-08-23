export interface DatabaseConnectivityResult {
  readonly rows: readonly { readonly ok: unknown }[];
}

export interface DatabaseConnectivityClient {
  query(): Promise<DatabaseConnectivityResult>;
}

/**
 * Runs the smallest possible read-only database probe. The caller owns the
 * pool lifecycle; this function never logs provider errors or connection data.
 */
export async function verifyDatabaseConnectivity(client: DatabaseConnectivityClient): Promise<void> {
  const result = await client.query();
  if (result.rows.length !== 1 || String(result.rows[0]?.ok) !== "1") {
    throw new Error("Database connectivity probe returned an unexpected result.");
  }
}
