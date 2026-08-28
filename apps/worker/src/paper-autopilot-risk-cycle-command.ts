import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAgentRunRepository, createDatabase, createTelegramAlertRepository } from "@momentum/db";

import { createRuntimeAlertNotifier } from "./telegram-events.js";
import { getPaperAutopilotQuantity } from "./paper-quantity.js";
import { runPaperAutopilotRiskCycle } from "./paper-autopilot-cycle.js";
import type { ResearchWatchlistCandidate } from "@momentum/domain";

if (process.env.PAPER_AUTOPILOT_RISK_CYCLE_ONCE !== "true") throw new Error("PAPER_AUTOPILOT_RISK_CYCLE_ONCE must be exactly true.");
getPaperOnlyRuntimeConfig();
if (process.env.PAPER_AUTOPILOT_ENABLED !== "true" || process.env.OPERATING_MODE !== "paper_autopilot") throw new Error("The risk cycle requires command-scoped Paper Autopilot flags.");
const approvalReference = process.env.PAPER_AUTOPILOT_RISK_CYCLE_APPROVAL_REFERENCE?.trim();
if (!approvalReference || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(approvalReference)) throw new Error("PAPER_AUTOPILOT_RISK_CYCLE_APPROVAL_REFERENCE must be a bounded non-secret reference.");
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required for the paper risk cycle.");

const { db, pool } = createDatabase(databaseUrl);
try {
  const runs = await createAgentRunRepository(db).listRecent(100);
  const run = runs.find((item) => item.status === "succeeded" && item.artifactPayload && typeof item.artifactPayload === "object" && Array.isArray((item.artifactPayload as { readonly candidates?: unknown }).candidates));
  if (!run?.artifactPayload || typeof run.artifactPayload !== "object") throw new Error("No persisted research artifact with candidates is available.");
  const rawCandidates = (run.artifactPayload as { readonly candidates: readonly unknown[] }).candidates;
  const candidates = rawCandidates.filter((candidate): candidate is ResearchWatchlistCandidate => {
    if (!candidate || typeof candidate !== "object") return false;
    const value = candidate as Partial<ResearchWatchlistCandidate>;
    return (value.assetClass === "us_equity" || value.assetClass === "crypto") && typeof value.symbol === "string" && typeof value.dataAsOf === "string" && typeof value.momentumReturn === "string" && typeof value.averageVolume === "string";
  }).slice(0, 10);
  if (candidates.length === 0) throw new Error("Persisted research artifact contains no valid candidates.");
  const notifier = createRuntimeAlertNotifier(process.env, createTelegramAlertRepository(db));
  const results = await runPaperAutopilotRiskCycle({ approvalReference, candidates, db, environment: process.env, quantityForCandidate: (candidate) => getPaperAutopilotQuantity(candidate.assetClass, process.env), notify: notifier.notify });
  console.log(JSON.stringify({ approvalReference, candidateCount: candidates.length, decisions: results.map((result) => ({ approvalStatus: result.approvalStatus, intentId: result.intentId, symbol: result.symbol })), researchRunId: run.runId, status: "paper_risk_cycle_completed" }));
} catch {
  console.error("Paper Autopilot risk cycle failed closed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
