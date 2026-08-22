import { assertShadowEvaluationOnce } from "./shadow-evaluation.js";
import { createPaperMarketDataReader } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createDatabase, createShadowObservationRepository } from "@momentum/db";
import { createAlpacaShadowBarSource, runShadowEvaluationOnce } from "./shadow-evaluation-service.js";

const configuration = assertShadowEvaluationOnce();
if (!configuration.sourceConfigured) {
  throw new Error("Shadow evaluation finalized-bar source is not configured.");
}

const runtime = getPaperOnlyRuntimeConfig();
if (!runtime.brokerConnectionEnabled) throw new Error("BROKER_CONNECTION_ENABLED must be true for shadow evaluation.");
const { db, pool } = createDatabase();
const reader = createPaperMarketDataReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" });
const repository = createShadowObservationRepository(db);
try {
  const result = await runShadowEvaluationOnce({ barSource: createAlpacaShadowBarSource(reader), repository });
  console.log(JSON.stringify({ alreadyClosed: result.alreadyClosed, closed: result.closed, failures: result.failures.length, opened: result.opened, processed: result.processed }));
} catch {
  console.error("Shadow evaluation failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
