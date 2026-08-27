import type { AgentRunRequest, ResearchAgentInput, StrategyAssetClass } from "@momentum/domain";
import { createCryptoResearchAgent, createStockResearchAgent } from "@momentum/domain";

import { executeResearchRun, type ResearchRunPersistence } from "./research-runner.js";
import { getResearchScheduleReadiness, type ResearchPreparationJob } from "./research-scheduler.js";

export interface ResearchPreparationInputPlan {
  readonly agentType: "crypto_research" | "stock_research";
  readonly assetClass: StrategyAssetClass;
  readonly limit: number;
  readonly maxCandidates: number;
  readonly symbols: readonly string[];
  readonly timeframe: "1Day" | "1Hour" | "1Min" | "1Month" | "1Week" | "5Min" | "15Min";
}

export interface ResearchPreparationConfig {
  readonly cryptoTimeframe: ResearchPreparationInputPlan["timeframe"];
  readonly limit: number;
  readonly maxCandidates: number;
  readonly stockSymbols: readonly string[];
  readonly stockTimeframe: ResearchPreparationInputPlan["timeframe"];
  readonly cryptoSymbols: readonly string[];
}

export interface ResearchPreparationSource {
  read(plan: ResearchPreparationInputPlan): Promise<ResearchAgentInput>;
}

export interface ResearchPreparationResult {
  readonly agentType: ResearchPreparationInputPlan["agentType"];
  readonly runId: string;
  readonly status: "failed" | "succeeded";
  readonly recommendationSymbols?: readonly string[];
}

const allowedTimeframes = new Set<ResearchPreparationInputPlan["timeframe"]>(["1Day", "1Hour", "1Min", "1Month", "1Week", "5Min", "15Min"]);

function parseBoundedInteger(name: string, value: string | undefined, defaultValue: number, min: number, max: number): number {
  const result = Number(value ?? String(defaultValue));
  if (!Number.isSafeInteger(result) || result < min || result > max) throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  return result;
}

function parseSymbols(name: string, value: string | undefined): readonly string[] {
  const symbols = (value ?? "").split(",").map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
  if (symbols.length < 1 || symbols.length > 10) throw new Error(`${name} must contain 1 to 10 symbols.`);
  if (new Set(symbols).size !== symbols.length) throw new Error(`${name} must not contain duplicate symbols.`);
  if (symbols.some((symbol) => !/^[A-Z0-9][A-Z0-9._/-]{0,19}$/.test(symbol))) throw new Error(`${name} contains an invalid symbol.`);
  return Object.freeze(symbols);
}

export function getResearchPreparationConfig(environment: NodeJS.ProcessEnv = process.env): ResearchPreparationConfig {
  const stockTimeframe = environment.RESEARCH_STOCK_TIMEFRAME ?? environment.RESEARCH_TIMEFRAME ?? "1Day";
  const cryptoTimeframe = environment.RESEARCH_CRYPTO_TIMEFRAME ?? environment.RESEARCH_TIMEFRAME ?? "1Hour";
  if (!allowedTimeframes.has(stockTimeframe as ResearchPreparationInputPlan["timeframe"])) throw new Error("RESEARCH_STOCK_TIMEFRAME is not supported.");
  if (!allowedTimeframes.has(cryptoTimeframe as ResearchPreparationInputPlan["timeframe"])) throw new Error("RESEARCH_CRYPTO_TIMEFRAME is not supported.");
  return {
    cryptoTimeframe: cryptoTimeframe as ResearchPreparationInputPlan["timeframe"],
    cryptoSymbols: parseSymbols("RESEARCH_CRYPTO_SYMBOLS", environment.RESEARCH_CRYPTO_SYMBOLS ?? environment.RESEARCH_SYMBOLS),
    limit: parseBoundedInteger("RESEARCH_LIMIT", environment.RESEARCH_LIMIT, 100, 2, 1_000),
    maxCandidates: parseBoundedInteger("RESEARCH_MAX_CANDIDATES", environment.RESEARCH_MAX_CANDIDATES, 10, 1, 20),
    stockSymbols: parseSymbols("RESEARCH_STOCK_SYMBOLS", environment.RESEARCH_STOCK_SYMBOLS ?? environment.RESEARCH_SYMBOLS),
    stockTimeframe: stockTimeframe as ResearchPreparationInputPlan["timeframe"],
  };
}

export function createResearchPreparationPlan(config: ResearchPreparationConfig): readonly ResearchPreparationInputPlan[] {
  return Object.freeze([
    { agentType: "stock_research", assetClass: "us_equity", limit: config.limit, maxCandidates: config.maxCandidates, symbols: config.stockSymbols, timeframe: config.stockTimeframe },
    { agentType: "crypto_research", assetClass: "crypto", limit: config.limit, maxCandidates: config.maxCandidates, symbols: config.cryptoSymbols, timeframe: config.cryptoTimeframe },
  ]);
}

function runIdFor(plan: ResearchPreparationInputPlan, capturedAt: string): string {
  return `research-preparation-${plan.agentType}-${capturedAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
}

export async function executeResearchPreparation(input: {
  readonly clock?: () => Date;
  readonly persistence: ResearchRunPersistence;
  readonly preparation: ResearchPreparationInputPlan;
  readonly source: ResearchPreparationSource;
}): Promise<ResearchPreparationResult> {
  const marketInput = await input.source.read(input.preparation);
  const request: AgentRunRequest = {
    agentType: input.preparation.agentType,
    createdAt: marketInput.capturedAt,
    inputRefs: [`alpaca-market:${marketInput.assetClass}:${marketInput.capturedAt}`],
    promptVersion: "research-preparation@1",
    runId: runIdFor(input.preparation, marketInput.capturedAt),
    task: `Prepare ${input.preparation.assetClass} research evidence.`,
  };
  const handler = input.preparation.agentType === "stock_research" ? createStockResearchAgent(marketInput) : createCryptoResearchAgent(marketInput);
  const result = await executeResearchRun({ ...(input.clock ? { clock: input.clock } : {}), handler, persistence: input.persistence, request });
  const rawCandidates = result.artifact?.payload && typeof result.artifact.payload === "object" ? (result.artifact.payload as { readonly candidates?: unknown }).candidates : undefined;
  const recommendationSymbols = Array.isArray(rawCandidates) ? rawCandidates.map((candidate) => candidate && typeof candidate === "object" && typeof (candidate as { readonly symbol?: unknown }).symbol === "string" ? (candidate as { readonly symbol: string }).symbol : "").filter(Boolean).slice(0, 10) : [];
  return { agentType: input.preparation.agentType, runId: request.runId, status: result.status, ...(recommendationSymbols.length > 0 ? { recommendationSymbols } : {}) };
}

export function createResearchPreparationQueueHandler(input: {
  readonly clock?: () => Date;
  readonly environment?: NodeJS.ProcessEnv;
  readonly persistence: ResearchRunPersistence;
  readonly source: ResearchPreparationSource;
  readonly notify?: (alert: { readonly code: string; readonly message: string; readonly severity: "critical" | "info" | "warning" }) => void;
}) {
  const environment = input.environment ?? process.env;
  return async (job: ResearchPreparationJob): Promise<readonly ResearchPreparationResult[]> => {
    void job;
    const readiness = getResearchScheduleReadiness(environment);
    if (readiness.status !== "ready") throw new Error(`Research preparation is not ready: ${readiness.status}.`);
    const plans = createResearchPreparationPlan(getResearchPreparationConfig(environment));
    const results: ResearchPreparationResult[] = [];
    for (const preparation of plans) {
      try {
        const result = await executeResearchPreparation({ ...(input.clock ? { clock: input.clock } : {}), persistence: input.persistence, preparation, source: input.source });
        results.push(result);
        input.notify?.({ code: "research_recommendations", message: `${result.agentType} produced ${result.recommendationSymbols?.length ?? 0} recommendation(s): ${(result.recommendationSymbols ?? []).join(", ") || "none"}.`, severity: "info" });
      } catch {
        results.push({ agentType: preparation.agentType, runId: `research-preparation-${preparation.agentType}-failed-${Date.now()}`, status: "failed" });
        input.notify?.({ code: "research_preparation_failed", message: `${preparation.agentType} research preparation failed closed; no trade was proposed from this run.`, severity: "critical" });
      }
    }
    if (results.every((result) => result.status === "failed")) throw new Error("All research preparation plans failed.");
    return results;
  };
}
