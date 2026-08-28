import { createPaperAccountReader, createPaperMarketDataReader, createPaperOrderSubmitter } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAgentRunRepository, createAccountStateRepository, createDatabase, createPaperOrderRepository, createTelegramAlertRepository, type PersistedAgentRun } from "@momentum/db";
import { isGlobalKillSwitchActive } from "@momentum/config";
import { createCryptoResearchAgent, createStockResearchAgent, type AgentRunRequest, type ResearchAgentInput } from "@momentum/domain";

import { executeResearchRun } from "./research-runner.js";
import { createAlpacaResearchInputSource } from "./research-market-source.js";
import { reconcilePaperAccount } from "./reconcile.js";
import { getResearchMarketInputRefs } from "./research-market-run-once-guard.js";
import { validatePaperE2ERunOnce } from "./paper-e2e-run-once.js";
import { assessResearchCandidateRisk, isPaperBaselineVerified } from "./paper-risk-dry-run.js";
import { executePaperAutopilotOrder } from "./paper-execution.js";
import { createRuntimeAlertNotifier } from "./telegram-events.js";

const config = validatePaperE2ERunOnce();
getPaperOnlyRuntimeConfig();
const { db, pool } = createDatabase();
const accountRepository = createAccountStateRepository(db);
const agentRepository = createAgentRunRepository(db);
const notifier = createRuntimeAlertNotifier(process.env, createTelegramAlertRepository(db));
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
  stage = "research_input";
  const assetClass = config.agentType === "stock_research" ? "us_equity" : "crypto";
  const marketReader = createAlpacaResearchInputSource(createPaperMarketDataReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" }));
  let marketInput: ResearchAgentInput;
  try {
    marketInput = await marketReader.read({ assetClass, limit: config.limit, maxCandidates: config.maxCandidates, symbols: config.symbols, timeframe: config.timeframe });
  } catch (error: unknown) {
    // A newly opened paper feed can expose only one daily bar. Retry once with
    // bounded hourly history so the research agent's two-bar invariant holds.
    if (config.timeframe !== "1Day" || !(error instanceof Error) || !error.message.includes("fewer than 2 bars")) throw error;
    marketInput = await marketReader.read({ assetClass, limit: config.limit, maxCandidates: config.maxCandidates, symbols: config.symbols, timeframe: "1Hour" });
  }
  if (config.timeframe === "1Day") {
    const barCounts = new Map<string, number>();
    for (const bar of marketInput.bars) barCounts.set(bar.symbol, (barCounts.get(bar.symbol) ?? 0) + 1);
    if (![...barCounts.values()].some((count) => count >= 2)) {
      // A daily response can contain one bar for each symbol while still
      // passing the aggregate source check. Use hourly history so at least
      // one symbol can produce an auditable research candidate.
      marketInput = await marketReader.read({ assetClass, limit: config.limit, maxCandidates: config.maxCandidates, symbols: config.symbols, timeframe: "1Hour" });
    }
  }
  const request: AgentRunRequest = { agentType: config.agentType, createdAt: new Date().toISOString(), inputRefs: getResearchMarketInputRefs(assetClass, marketInput.capturedAt, config.approvalReference), promptVersion: "research-market-boundary@1", runId: `${config.runId}-research`, task: `Read and rank ${assetClass} market bars once as part of the paper evidence cycle.` };
  const handler = config.agentType === "stock_research" ? createStockResearchAgent(marketInput as ResearchAgentInput & { assetClass: "us_equity" }) : createCryptoResearchAgent(marketInput as ResearchAgentInput & { assetClass: "crypto" });
  stage = "research_agent";
  const research = await executeResearchRun({ handler, persistence, request });
  if (research.status !== "succeeded") throw new Error("paper_e2e_research_failed");
  const payload = research.artifact?.payload as { readonly candidates?: readonly unknown[] } | undefined;
  const rawCandidate = payload?.candidates?.[0];
  if (!rawCandidate || typeof rawCandidate !== "object") throw new Error("paper_e2e_no_research_candidate");
  const candidate = rawCandidate as Parameters<typeof assessResearchCandidateRisk>[0]["candidate"];
  stage = "risk_assessment";
  const model = await accountRepository.getLatestReadModel();
  if (!model) throw new Error("paper_e2e_account_read_model_missing");
  const initialSnapshot = await accountRepository.getInitial(snapshot.accountId);
  const baselineConfirmation = await accountRepository.getLatestPaperBaselineConfirmation(snapshot.accountId, "100000");
  const now = new Date();
  const accountFresh = Math.floor((now.getTime() - model.freshness.capturedAt.getTime()) / 1000) <= 172_800;
  const state = {
    accountBaselineVerified: Boolean(baselineConfirmation || (initialSnapshot && isPaperBaselineVerified(initialSnapshot.equity))),
    accountFresh,
    dataFresh: marketInput.freshness === "fresh",
    killSwitchActive: isGlobalKillSwitchActive(),
    openPositions: model.positions.map((position) => ({ assetClass: position.assetClass === "crypto" ? "crypto" as const : "us_equity" as const, marketValue: position.marketValue })),
    submittedEntriesLast24Hours: model.orders.filter((order) => order.side.toLowerCase() === "buy" && order.submittedAt && now.getTime() - order.submittedAt.getTime() <= 86_400_000).length,
  };
  const quantity = process.env.PAPER_E2E_QUANTITY?.trim() || "1";
  const { approval, intentId } = assessResearchCandidateRisk({ candidate, currentAt: now.toISOString(), equity: snapshot.equity, quantity, state });
  stage = "risk_persist";
  if (!config.orderOnce || approval.status !== "approved") {
    await createPaperOrderRepository(db).recordSubmission({ approvalId: approval.approvalId, assetClass: candidate.assetClass, clientOrderId: `${intentId}:dry-run`, intentId, ...(candidate.marketSnapshot ? { marketSnapshot: Object.fromEntries(Object.entries(candidate.marketSnapshot).map(([key, value]) => [key, value])) as Readonly<Record<string, string | null>> } : {}), quantity, riskDecision: { estimatedLoss: approval.assessment.estimatedLoss, estimatedLossPercent: approval.assessment.estimatedLossPercent, policyVersion: approval.policyVersion, reasons: approval.assessment.reasons }, status: approval.status === "approved" ? "risk_dry_run_approved" : "risk_dry_run_rejected", symbol: candidate.symbol });
    console.log(JSON.stringify({ approvalStatus: approval.status, approvalReference: config.approvalReference, capturedAt: snapshot.capturedAt.toISOString(), estimatedLossPercent: approval.assessment.estimatedLossPercent, intentId, reasons: approval.assessment.reasons, researchRunId: request.runId, runId: config.runId, status: "completed" }));
  } else {
    stage = "order_submit";
    const orderRepository = createPaperOrderRepository(db);
    const order = await executePaperAutopilotOrder({ autopilot: { enabled: true, mode: "paper_autopilot" }, order: { approval: { approvalId: approval.approvalId, intentId, riskDecision: { estimatedLoss: approval.assessment.estimatedLoss, estimatedLossPercent: approval.assessment.estimatedLossPercent, policyVersion: approval.policyVersion, reasons: approval.assessment.reasons }, status: "approved" }, assetClass: candidate.assetClass, clientOrderId: `${intentId}-paper`, ...(candidate.marketSnapshot ? { marketSnapshot: Object.fromEntries(Object.entries(candidate.marketSnapshot).map(([key, value]) => [key, value])) as Readonly<Record<string, string | null>> } : {}), quantity, side: "buy", symbol: candidate.symbol, timeInForce: candidate.assetClass === "crypto" ? "gtc" : "day", type: "market" }, notify: notifier.notify, persistence: orderRepository, submitter: createPaperOrderSubmitter({ apiKey: process.env.ALPACA_API_KEY ?? "", brokerConnectionEnabled: true, secretKey: process.env.ALPACA_SECRET_KEY ?? "" }) });
    stage = "post_order_reconciliation";
    await reconcilePaperAccount(reader, accountRepository);
    console.log(JSON.stringify({ alpacaOrderId: order.brokerOrder.alpacaOrderId, approvalStatus: approval.status, approvalReference: config.approvalReference, capturedAt: snapshot.capturedAt.toISOString(), estimatedLossPercent: approval.assessment.estimatedLossPercent, filledQuantity: order.brokerOrder.filledQuantity ?? null, intentId, researchRunId: request.runId, runId: config.runId, status: "paper_order_reconciled" }));
  }
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "unknown";
  const errorCode = message.match(/HTTP \d{3}/)?.[0] ?? (message.includes("order") ? "order_submission_error" : "unknown");
  console.error(JSON.stringify({ errorCode, stage }));
  process.exitCode = 1;
} finally {
  await pool.end();
}
