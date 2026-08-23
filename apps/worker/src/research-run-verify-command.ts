import { createAgentRunRepository, createDatabase } from "@momentum/db";

import { verifyResearchRun } from "./research-run-verification.js";

if (process.env.RESEARCH_RUN_VERIFY !== "true") throw new Error("RESEARCH_RUN_VERIFY must be exactly true for the guarded research run verification command.");
const runId = process.env.RESEARCH_RUN_ID?.trim();
const approvalReference = process.env.RESEARCH_MARKET_APPROVAL_REFERENCE?.trim();
if (!runId) throw new Error("RESEARCH_RUN_ID is required for research run verification.");
if (!approvalReference) throw new Error("RESEARCH_MARKET_APPROVAL_REFERENCE is required for research run verification.");
if (!process.env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required for research run verification.");
const { db, pool } = createDatabase();
try {
  const run = await createAgentRunRepository(db).get(runId);
  if (!run) throw new Error("Research run was not found.");
  const result = verifyResearchRun({ agentType: run.agentType, artifactType: run.artifactType, inputRefs: run.inputRefs, runId: run.runId, status: run.status }, approvalReference);
  console.log(JSON.stringify(result));
} catch {
  console.error("Research run verification failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
