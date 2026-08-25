import { createPaperAccountReader, createPaperMarketDataReader } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAgentRunRepository, createAccountStateRepository, createDatabase, type PersistedAgentRun } from "@momentum/db";
import { createCryptoResearchAgent, createStockResearchAgent, type AgentRunRequest, type ResearchAgentInput } from "@momentum/domain";

import { executeResearchRun } from "./research-runner.js";
import { createAlpacaResearchInputSource } from "./research-market-source.js";
import { reconcilePaperAccount } from "./reconcile.js";
import { getResearchMarketInputRefs } from "./research-market-run-once-guard.js";
import { validatePaperE2ERunOnce } from "./paper-e2e-run-once.js";

const config = validatePaperE2ERunOnce();
getPaperOnlyRuntimeConfig();
const { db, pool } = createDatabase();
const accountRepository = createAccountStateRepository(db);
const agentRepository = createAgentRunRepository(db);
const persistence = {
  enqueue: (run: AgentRunRequest) => agentRepository.enqueue({ agentType: run.agentType, createdAt: new Date(run.createdAt), inputRefs: run.inputRefs, ...(run.modelProvider ? { modelProvider: run.modelProvider } : {}), promptVersion: run.promptVersion, runId: run.runId, status: "queued", task: run.task } satisfies PersistedAgentRun),
  fail: agentRepository.fail,
  start: agentRepository.start,
  succeed: agentRepository.succeed,
};

try {
  const reader = createPaperAccountReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" });
  const snapshot = await reconcilePaperAccount(reader, accountRepository, { approvalReference: config.approvalReference, runId: config.runId });
  const assetClass = config.agentType === "stock_research" ? "us_equity" : "crypto";
  const marketInput = await createAlpacaResearchInputSource(createPaperMarketDataReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" })).read({ assetClass, limit: config.limit, maxCandidates: config.maxCandidates, symbols: config.symbols, timeframe: config.timeframe });
  const request: AgentRunRequest = { agentType: config.agentType, createdAt: new Date().toISOString(), inputRefs: getResearchMarketInputRefs(assetClass, marketInput.capturedAt, config.approvalReference), promptVersion: "research-market-boundary@1", runId: `${config.runId}-research`, task: `Read and rank ${assetClass} market bars once as part of the paper evidence cycle.` };
  const handler = config.agentType === "stock_research" ? createStockResearchAgent(marketInput as ResearchAgentInput & { assetClass: "us_equity" }) : createCryptoResearchAgent(marketInput as ResearchAgentInput & { assetClass: "crypto" });
  const research = await executeResearchRun({ handler, persistence, request });
  if (research.status !== "succeeded") throw new Error("paper_e2e_research_failed");
  console.log(JSON.stringify({ approvalReference: config.approvalReference, capturedAt: snapshot.capturedAt.toISOString(), researchRunId: request.runId, runId: config.runId, status: "completed" }));
} catch {
  console.error("Paper end-to-end evidence run failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
