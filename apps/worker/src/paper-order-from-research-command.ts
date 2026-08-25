import { createPaperAccountReader, createPaperOrderSubmitter } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig, isGlobalKillSwitchActive } from "@momentum/config";
import { createAccountStateRepository, createAgentRunRepository, createDatabase, createPaperOrderRepository } from "@momentum/db";
import { executePaperAutopilotOrder } from "./paper-execution.js";
import { assessResearchCandidateRisk } from "./paper-risk-dry-run.js";
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
try {
  const snapshot = await reconcilePaperAccount(reader, accountRepository, { approvalReference, runId: `paper-order-${Date.now()}` });
  const research = await agentRepository.get(researchRunId);
  const payload = research?.status === "succeeded" && research.artifactPayload && typeof research.artifactPayload === "object" ? research.artifactPayload as { readonly candidates?: readonly unknown[] } : undefined;
  const rawCandidate = payload?.candidates?.[0];
  if (!rawCandidate || typeof rawCandidate !== "object") throw new Error("Persisted research artifact has no candidate.");
  const candidate = rawCandidate as Parameters<typeof assessResearchCandidateRisk>[0]["candidate"];
  const model = await accountRepository.getLatestReadModel();
  if (!model) throw new Error("Paper account read model is unavailable.");
  const now = new Date();
  const candidateAge = now.getTime() - Date.parse(candidate.dataAsOf);
  const state = {
    accountBaselineVerified: Number(snapshot.equity) === 100000,
    accountFresh: Math.floor((now.getTime() - model.freshness.capturedAt.getTime()) / 1000) <= 172_800,
    dataFresh: Number.isFinite(candidateAge) && candidateAge >= 0 && candidateAge <= 172_800_000,
    killSwitchActive: isGlobalKillSwitchActive(),
    openPositions: model.positions.map((position) => ({ assetClass: position.assetClass === "crypto" ? "crypto" as const : "us_equity" as const, marketValue: position.marketValue })),
    submittedEntriesLast24Hours: model.orders.filter((order) => order.side.toLowerCase() === "buy" && order.submittedAt && now.getTime() - order.submittedAt.getTime() <= 86_400_000).length,
  };
  const quantity = process.env.PAPER_ORDER_QUANTITY?.trim() || "1";
  const { approval, intentId } = assessResearchCandidateRisk({ candidate, currentAt: now.toISOString(), equity: snapshot.equity, quantity, state });
  const orderRepository = createPaperOrderRepository(db);
  if (approval.status !== "approved") {
    await orderRepository.recordSubmission({ approvalId: approval.approvalId, assetClass: candidate.assetClass, clientOrderId: `${intentId}:rejected`, intentId, quantity, riskDecision: { estimatedLoss: approval.assessment.estimatedLoss, estimatedLossPercent: approval.assessment.estimatedLossPercent, policyVersion: approval.policyVersion, reasons: approval.assessment.reasons }, status: "paper_order_risk_rejected", symbol: candidate.symbol });
    throw new Error("Deterministic paper risk approval rejected the order.");
  }
  const result = await executePaperAutopilotOrder({ autopilot: { enabled: true, mode: "paper_autopilot" }, order: { approval: { approvalId: approval.approvalId, intentId, riskDecision: { estimatedLoss: approval.assessment.estimatedLoss, estimatedLossPercent: approval.assessment.estimatedLossPercent, policyVersion: approval.policyVersion, reasons: approval.assessment.reasons }, status: "approved" }, assetClass: candidate.assetClass, clientOrderId: `${intentId}-paper`, ...(candidate.marketSnapshot ? { marketSnapshot: candidate.marketSnapshot as unknown as Readonly<Record<string, string | null>> } : {}), quantity, side: "buy", symbol: candidate.symbol, timeInForce: "day", type: "market" }, persistence: orderRepository, submitter: createPaperOrderSubmitter({ apiKey: process.env.ALPACA_API_KEY ?? "", brokerConnectionEnabled: true, secretKey: process.env.ALPACA_SECRET_KEY ?? "" }) });
  await reconcilePaperAccount(reader, accountRepository);
  console.log(JSON.stringify({ alpacaOrderId: result.brokerOrder.alpacaOrderId, approvalReference, approvalStatus: approval.status, filledQuantity: result.brokerOrder.filledQuantity ?? null, intentId, researchRunId, status: "paper_order_reconciled" }));
} catch {
  console.error("One-shot paper order failed closed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
