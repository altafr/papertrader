import { createDatabase, createAgentRunRepository } from "@momentum/db";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createCryptoResearchAgent, createStockResearchAgent, runMacroAdvisory, type AgentRunRequest, type EconomicEvent, type ResearchAgentInput, type MacroAdvisoryInput, type StrategyBar } from "@momentum/domain";
import { executeResearchRun } from "./research-runner.js";

if (process.env.RESEARCH_RUN_ONCE !== "true") throw new Error("RESEARCH_RUN_ONCE must be exactly true for the guarded research command.");
getPaperOnlyRuntimeConfig();
if (!process.env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required for the research command.");
const agentType = process.env.RESEARCH_AGENT_TYPE;
if (agentType !== "stock_research" && agentType !== "crypto_research" && agentType !== "macro_advisory") throw new Error("RESEARCH_AGENT_TYPE must be stock_research, crypto_research, or macro_advisory.");
const rawInput = process.env.RESEARCH_INPUT_JSON;
if (!rawInput?.trim() || rawInput.length > 500_000) throw new Error("RESEARCH_INPUT_JSON is required and bounded.");
let parsed: unknown;
try { parsed = JSON.parse(rawInput) as unknown; } catch { throw new Error("RESEARCH_INPUT_JSON must be valid JSON."); }
if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("RESEARCH_INPUT_JSON must be an object.");
const input = parsed as Record<string, unknown>;
const capturedAt = String(input.capturedAt ?? "");
const inputRefs = Array.isArray(input.inputRefs) ? input.inputRefs.map(String) : [`research-input:${capturedAt}`];
const request: AgentRunRequest = { agentType, createdAt: new Date().toISOString(), inputRefs, promptVersion: "research-boundary@1", runId: `research-${Date.now()}`, task: `Run ${agentType} once.` };
const { db, pool } = createDatabase();
const repository = createAgentRunRepository(db);
const persistence = {
  ...repository,
  enqueue: (run: AgentRunRequest) => repository.enqueue({
    agentType: run.agentType,
    createdAt: new Date(run.createdAt),
    inputRefs: run.inputRefs,
    ...(run.modelProvider ? { modelProvider: run.modelProvider } : {}),
    promptVersion: run.promptVersion,
    runId: run.runId,
    status: "queued",
    task: run.task,
  }),
};
try {
  let handler;
  if (agentType === "macro_advisory") {
    handler = () => runMacroAdvisory({ capturedAt, events: (input.events ?? []) as EconomicEvent[], freshness: "fresh", horizonHours: Number(input.horizonHours ?? 24), source: input.source === "operator" ? "operator" : "provider" } satisfies MacroAdvisoryInput);
  } else {
    const researchInput = { bars: (input.bars ?? []) as StrategyBar[], capturedAt, freshness: "fresh", maxCandidates: Number(input.maxCandidates ?? 10), source: "alpaca" } satisfies Omit<ResearchAgentInput, "assetClass">;
    handler = agentType === "stock_research" ? createStockResearchAgent({ ...researchInput, assetClass: "us_equity" }) : createCryptoResearchAgent({ ...researchInput, assetClass: "crypto" });
  }
  const result = await executeResearchRun({ handler, persistence, request });
  if (result.status !== "succeeded") throw new Error("research_run_failed");
  console.log("Research run completed.");
} catch {
  console.error("Research run failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
