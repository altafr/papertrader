import { createPaperAccountReader } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAccountStateRepository, createDatabase } from "@momentum/db";

import { reconcilePaperAccount } from "./reconcile.js";

if (process.env.RECONCILE_ONCE !== "true") {
  throw new Error("RECONCILE_ONCE must be exactly true for a one-shot reconciliation.");
}

const runtime = getPaperOnlyRuntimeConfig();
if (!runtime.brokerConnectionEnabled) {
  throw new Error("BROKER_CONNECTION_ENABLED must be true for reconciliation.");
}

const { db, pool } = createDatabase();
const reader = createPaperAccountReader({
  apiKey: process.env.ALPACA_API_KEY ?? "",
  secretKey: process.env.ALPACA_SECRET_KEY ?? "",
});
const repository = createAccountStateRepository(db);

try {
  await reconcilePaperAccount(reader, repository);
  console.log("Paper reconciliation completed.");
} catch {
  console.error("Paper reconciliation failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
