import { createPaperAccountReader, createPaperMarketDataReader } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAgentRunRepository, createAccountStateRepository, createDatabase, createPaperOrderRepository, type PersistedAgentRun } from "@momentum/db";
import { isGlobalKillSwitchActive } from "@momentum/config";
import { createCryptoResearchAgent, createStockResearchAgent, type AgentRunRequest, type ResearchAgentInput } from "@momentum/domain";

import { executeResearchRun } from "./research-runner.js";
import { createAlpacaResearchInputSource } from "./research-market-source.js";
import { reconcilePaperAccount } from "./reconcile.js";
import { getResearchMarketInputRefs } from "./research-market-run-once-guard.js";
import { validatePaperE2ERunOnce } from "./paper-e2e-run-once.js";
import { assessResearchCandidateRisk } from "./paper-risk-dry-run.js";

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

let stage = "reconciliation";
try {
  const reader = createPaperAccountReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" });
  const snapshot = await reconcilePaperAccount(reader, accountRepository, { approvalReference: config.approvalReference, runId: config.runId });
  stage = "research";
  const assetClass = config.agentType === "stock_research" ? "us_equity" : "crypto";
  const marketInput = await createAlpacaResearchInputSource(createPaperMarketDataReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" })).read({ assetClass, limit: config.limit, maxCandidates: config.maxCandidates, symbols: config.symbols, timeframe: config.timeframe });
  const request: AgentRunRequest = { agentType: config.agentType, createdAt: new Date().toISOString(), inputRefs: getResearchMarketInputRefs(assetClass, marketInput.capturedAt, config.approvalReference), promptVersion: "research-market-boundary@1", runId: `${config.runId}-research`, task: `Read and rank ${assetClass} market bars once as part of the paper evidence cycle.` };
  const handler = config.agentType === "stock_research" ? createStockResearchAgent(marketInput as ResearchAgentInput & { assetClass: "us_equity" }) : createCryptoResearchAgent(marketInput as ResearchAgentInput & { assetClass: "crypto" });
  const research = await executeResearchRun({ handler, persistence, request });
  if (research.status !== "succeeded") throw new Error("paper_e2e_research_failed");
  const payload = research.artifact?.payload as { readonly candidates?: readonly unknown[] } | undefined;
  const rawCandidate = payload?.candidates?.[0];
  if (!rawCandidate || typeof rawCandidate !== "object") throw new Error("paper_e2e_no_research_candidate");
  const candidate = rawCandidate as Parameters<typeof assessResearchCandidateRisk>[0]["candidate"];
  stage = "risk_assessment";
  const model = await accountRepository.getLatestReadModel();
  if (!model) throw new Error("paper_e2e_account_read_model_missing");
  const now = new Date();
  const accountFresh = Math.floor((now.getTime() - model.freshness.capturedAt.getTime()) / 1000) <= 172_800;
  const state = {
    accountBaselineVerified: Number(snapshot.equity) === 100000,
    accountFresh,
    dataFresh: marketInput.freshness === "fresh",
    killSwitchActive: isGlobalKillSwitchActive(),
    openPositions: model.positions.map((position) => ({ assetClass: position.assetClass === "crypto" ? "crypto" as const : "us_equity" as const, marketValue: position.marketValue })),
    submittedEntriesLast24Hours: model.orders.filter((order) => order.side.toLowerCase() === "buy" && order.submittedAt && now.getTime() - order.submittedAt.getTime() <= 86_400_000).length,
  };
  const quantity = process.env.PAPER_E2E_QUANTITY?.trim() || "1";
  const { approval, intentId } = assessResearchCandidateRisk({ candidate, currentAt: now.toISOString(), equity: snapshot.equity, quantity, state });
  stage = "risk_persist";
  await createPaperOrderRepository(db).recordSubmission({ approvalId: approval.approvalId, assetClass: candidate.assetClass, clientOrderId: `${intentId}:dry-run`, intentId, ...(candidate.marketSnapshot ? { marketSnapshot: Object.fromEntries(Object.entries(candidate.marketSnapshot).map(([key, value]) => [key, value])) as Readonly<Record<string, string | null>> } : {}), quantity, riskDecision: { estimatedLoss: approval.assessment.estimatedLoss, estimatedLossPercent: approval.assessment.estimatedLossPercent, policyVersion: approval.policyVersion, reasons: approval.assessment.reasons }, status: approval.status === "approved" ? "risk_dry_run_approved" : "risk_dry_run_rejected", symbol: candidate.symbol });
  console.log(JSON.stringify({ approvalStatus: approval.status, approvalReference: config.approvalReference, capturedAt: snapshot.capturedAt.toISOString(), estimatedLossPercent: approval.assessment.estimatedLossPercent, intentId, researchRunId: request.runId, runId: config.runId, status: "completed" }));
} catch {
  console.error(`Paper end-to-end evidence run failed (stage=${stage}).`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
