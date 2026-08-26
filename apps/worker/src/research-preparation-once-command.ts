import { createPaperMarketDataReader } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAgentRunRepository, createDatabase } from "@momentum/db";
import type { AgentRunRequest } from "@momentum/domain";
import { createResearchPreparationQueueHandler } from "./research-preparation.js";
import { createAlpacaResearchInputSource } from "./research-market-source.js";

if (process.env.RESEARCH_PREPARATION_ONCE !== "true") throw new Error("RESEARCH_PREPARATION_ONCE must be exactly true.");
const approvalReference = process.env.RESEARCH_PREPARATION_APPROVAL_REFERENCE?.trim();
if (!approvalReference || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(approvalReference)) throw new Error("RESEARCH_PREPARATION_APPROVAL_REFERENCE must be a bounded non-secret reference.");
const runtime = getPaperOnlyRuntimeConfig();
if (!runtime.brokerConnectionEnabled) throw new Error("RESEARCH_PREPARATION_ONCE requires command-scoped broker connectivity.");
if (!process.env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required for research preparation.");

const { db, pool } = createDatabase();
const repository = createAgentRunRepository(db);
const persistence = {
  enqueue: (run: AgentRunRequest) => repository.enqueue({ agentType: run.agentType, createdAt: new Date(run.createdAt), inputRefs: run.inputRefs, ...(run.modelProvider ? { modelProvider: run.modelProvider } : {}), promptVersion: run.promptVersion, runId: run.runId, status: "queued", task: run.task }),
  fail: repository.fail,
  start: repository.start,
  succeed: repository.succeed,
};
try {
  const handler = createResearchPreparationQueueHandler({
    environment: process.env,
    persistence,
    source: createAlpacaResearchInputSource(createPaperMarketDataReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" })),
  });
  await handler({ kind: "research_preparation", version: 1 });
  console.log(JSON.stringify({ approvalReference, status: "research_preparation_completed" }));
} catch {
  console.error("Research preparation failed closed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
