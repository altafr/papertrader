import { createPaperAccountReader, createPaperMarketDataReader, createPaperOrderSubmitter } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig, isGlobalKillSwitchActive } from "@momentum/config";
import { createAccountStateRepository, createAgentRunRepository, createDatabase, createPaperOrderRepository } from "@momentum/db";
import { executePaperAutopilotOrder } from "./paper-execution.js";
import { assessResearchCandidateRisk, buildRiskCandidate, isPaperBaselineVerified } from "./paper-risk-dry-run.js";
import { reconcilePaperAccount } from "./reconcile.js";

if (process.env.PAPER_ORDER_FROM_RESEARCH_ONCE !== "true") throw new Error("PAPER_ORDER_FROM_RESEARCH_ONCE must be exactly true.");
if (process.env.PAPER_AUTOPILOT_ENABLED !== "true" || process.env.OPERATING_MODE !== "paper_autopilot") throw new Error("The one-shot paper order requires command-scoped Paper Autopilot flags.");
getPaperOnlyRuntimeConfig();
const researchRunId = process.env.PAPER_ORDER_RESEARCH_RUN_ID?.trim();
const approvalReference = process.env.PAPER_ORDER_APPROVAL_REFERENCE?.trim();
if (!researchRunId || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(researchRunId)) throw new Error("PAPER_ORDER_RESEARCH_RUN_ID must be a bounded identifier.");
if (!approvalReference || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(approvalReference)) throw new Error("PAPER_ORDER_APPROVAL_REFERENCE must be a bounded non-secret reference.");
const { db, pool } = createDatabase();
const accountRepository = createAccountStateRepository(db);
const agentRepository = createAgentRunRepository(db);
const reader = createPaperAccountReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" });
let stage = "reconciliation";
try {
  const snapshot = await reconcilePaperAccount(reader, accountRepository, { approvalReference, runId: `paper-order-${Date.now()}` });
  stage = "research_artifact";
  const research = await agentRepository.get(researchRunId);
  if (!research) throw new Error("Persisted research run is unavailable.");
  if (research.status !== "succeeded") throw new Error("Persisted research run did not succeed.");
  if (!research.artifactPayload || typeof research.artifactPayload !== "object") throw new Error("Persisted research artifact payload is unavailable.");
  const payload = research.artifactPayload as { readonly candidates?: readonly unknown[] };
  let rawCandidate = payload?.candidates?.[0];
  if ((!rawCandidate || typeof rawCandidate !== "object") && process.env.PAPER_ORDER_USE_SNAPSHOT_FALLBACK === "true") {
    stage = "snapshot_fallback";
    const symbol = (process.env.PAPER_ORDER_SYMBOL ?? "AAPL").trim().toUpperCase();
    const snapshots = await createPaperMarketDataReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" }).readSnapshots({ assetClass: "us_equity", symbols: [symbol] });
    const snapshot = snapshots.find((item) => item.symbol === symbol);
    const price = snapshot?.latestTrade?.price ?? snapshot?.dailyBar?.close ?? snapshot?.latestQuote?.askPrice;
    const timestamp = snapshot?.latestTrade?.timestamp ?? snapshot?.dailyBar?.timestamp ?? snapshot?.latestQuote?.timestamp;
    if (!snapshot || !price || !timestamp) throw new Error("Paper snapshot fallback has no usable price.");
    rawCandidate = { assetClass: "us_equity", averageVolume: snapshot.dailyBar?.volume ?? "1", dataAsOf: timestamp, marketSnapshot: { asOf: timestamp, atr14: null, close: price, ema20: null, ema50: null, relativeVolume20: null, rsi14: null, volume: snapshot.dailyBar?.volume ?? "1" }, momentumReturn: "0", symbol };
  }
  if (!Array.isArray(payload.candidates) && !rawCandidate) throw new Error("Persisted research artifact candidate list is unavailable.");
  if (!rawCandidate || typeof rawCandidate !== "object") throw new Error("Persisted research artifact has no candidate.");
  const candidate = rawCandidate as Parameters<typeof assessResearchCandidateRisk>[0]["candidate"];
  const model = await accountRepository.getLatestReadModel();
  if (!model) throw new Error("Paper account read model is unavailable.");
  const initialSnapshot = await accountRepository.getInitial(snapshot.accountId);
  const baselineConfirmation = await accountRepository.getLatestPaperBaselineConfirmation(snapshot.accountId, "100000");
  const baselineVerified = Boolean(baselineConfirmation || (initialSnapshot && isPaperBaselineVerified(initialSnapshot.equity)) || (process.env.PAPER_ORDER_BASELINE_VERIFY === "true" && isPaperBaselineVerified(snapshot.equity)));
  const now = new Date();
  const candidateAge = now.getTime() - Date.parse(candidate.dataAsOf);
  const state = {
    accountBaselineVerified: baselineVerified,
    accountFresh: Math.floor((now.getTime() - model.freshness.capturedAt.getTime()) / 1000) <= 172_800,
    dataFresh: Number.isFinite(candidateAge) && candidateAge >= 0 && candidateAge <= 172_800_000,
    killSwitchActive: isGlobalKillSwitchActive(),
    openPositions: model.positions.map((position) => ({ assetClass: position.assetClass === "crypto" ? "crypto" as const : "us_equity" as const, marketValue: position.marketValue })),
    submittedEntriesLast24Hours: model.orders.filter((order) => order.side.toLowerCase() === "buy" && order.submittedAt && now.getTime() - order.submittedAt.getTime() <= 86_400_000).length,
  };
  const quantity = process.env.PAPER_ORDER_QUANTITY?.trim() || "1";
  stage = "risk_gate";
  const riskCandidate = buildRiskCandidate(candidate, now);
  const { approval, intentId } = assessResearchCandidateRisk({ candidate, currentAt: now.toISOString(), equity: snapshot.equity, quantity, state });
  const orderRepository = createPaperOrderRepository(db);
  if (approval.status !== "approved") {
    await orderRepository.recordSubmission({ approvalId: approval.approvalId, assetClass: riskCandidate.assetClass, clientOrderId: `${intentId}:rejected`, intentId, entryPrice: riskCandidate.proposedEntryPrice, plannedStopPrice: riskCandidate.plannedStopPrice, ...(riskCandidate.plannedExitPrice ? { plannedTargetPrice: riskCandidate.plannedExitPrice } : {}), strategyKey: riskCandidate.strategyKey, strategyVersion: riskCandidate.strategyVersion, ...(riskCandidate.timeStopAt ? { timeStopAt: new Date(riskCandidate.timeStopAt) } : {}), quantity, riskDecision: { estimatedLoss: approval.assessment.estimatedLoss, estimatedLossPercent: approval.assessment.estimatedLossPercent, policyVersion: approval.policyVersion, reasons: approval.assessment.reasons }, status: "paper_order_risk_rejected", symbol: riskCandidate.symbol });
    console.error(JSON.stringify({ approvalStatus: approval.status, estimatedLossPercent: approval.assessment.estimatedLossPercent, reasons: approval.assessment.reasons }));
    throw new Error("Deterministic paper risk approval rejected the order.");
  }
  stage = "order_submit";
  const result = await executePaperAutopilotOrder({ autopilot: { enabled: true, mode: "paper_autopilot" }, order: { approval: { approvalId: approval.approvalId, intentId, riskDecision: { estimatedLoss: approval.assessment.estimatedLoss, estimatedLossPercent: approval.assessment.estimatedLossPercent, policyVersion: approval.policyVersion, reasons: approval.assessment.reasons }, status: "approved" }, assetClass: riskCandidate.assetClass, clientOrderId: `${intentId}-paper`, entryPrice: riskCandidate.proposedEntryPrice, plannedStopPrice: riskCandidate.plannedStopPrice, ...(riskCandidate.plannedExitPrice ? { plannedTargetPrice: riskCandidate.plannedExitPrice } : {}), strategyKey: riskCandidate.strategyKey, strategyVersion: riskCandidate.strategyVersion, ...(riskCandidate.timeStopAt ? { timeStopAt: riskCandidate.timeStopAt } : {}), ...(riskCandidate.marketSnapshot ? { marketSnapshot: riskCandidate.marketSnapshot as unknown as Readonly<Record<string, string | null>> } : {}), quantity, side: "buy", symbol: riskCandidate.symbol, timeInForce: "day", type: "market" }, persistence: orderRepository, submitter: createPaperOrderSubmitter({ apiKey: process.env.ALPACA_API_KEY ?? "", brokerConnectionEnabled: true, secretKey: process.env.ALPACA_SECRET_KEY ?? "" }) });
  stage = "post_order_reconciliation";
  await reconcilePaperAccount(reader, accountRepository);
  console.log(JSON.stringify({ alpacaOrderId: result.brokerOrder.alpacaOrderId, approvalReference, approvalStatus: approval.status, filledQuantity: result.brokerOrder.filledQuantity ?? null, intentId, researchRunId, status: "paper_order_reconciled" }));
} catch {
  console.error(`One-shot paper order failed closed (stage=${stage}).`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
