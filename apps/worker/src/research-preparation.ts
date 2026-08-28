import type { AgentRunRequest, ResearchAgentInput, ResearchWatchlistCandidate, StrategyAssetClass } from "@momentum/domain";
import { createCryptoResearchAgent, createStockResearchAgent } from "@momentum/domain";

import { executeResearchRun, type ResearchRunPersistence } from "./research-runner.js";
import { getResearchScheduleReadiness, type ResearchPreparationJob } from "./research-scheduler.js";
import { getDailyNotificationDedupeKey } from "./notification-dedupe.js";

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
  readonly stockWindowOnly: boolean;
}

export interface ResearchPreparationSource {
  read(plan: ResearchPreparationInputPlan): Promise<ResearchAgentInput>;
}

export interface ResearchPreparationResult {
  readonly agentType: ResearchPreparationInputPlan["agentType"];
  readonly candidates?: readonly ResearchWatchlistCandidate[];
  readonly runId: string;
  readonly status: "failed" | "succeeded";
  readonly recommendationSymbols?: readonly string[];
  readonly recommendationEvidence?: readonly string[];
}

export function getResearchRecommendationDedupeKey(agentType: ResearchPreparationResult["agentType"], occurredAt: Date = new Date()): string {
  return getDailyNotificationDedupeKey("research_recommendations", agentType, occurredAt);
}

const allowedTimeframes = new Set<ResearchPreparationInputPlan["timeframe"]>(["1Day", "1Hour", "1Min", "1Month", "1Week", "5Min", "15Min"]);

function isResearchCandidate(candidate: unknown): candidate is ResearchWatchlistCandidate {
  if (!candidate || typeof candidate !== "object") return false;
  const value = candidate as Partial<ResearchWatchlistCandidate>;
  return (value.assetClass === "us_equity" || value.assetClass === "crypto") && typeof value.symbol === "string" && typeof value.dataAsOf === "string" && typeof value.momentumReturn === "string" && typeof value.averageVolume === "string";
}

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

function parseBoolean(name: string, value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be exactly true or false.`);
}

/** Stock research is admitted only during the first and last two hours of the
 * regular New York session. Crypto remains eligible at every scheduler tick. */
export function isUsStockResearchWindow(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "-1");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "-1");
  if (!["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday ?? "")) return false;
  const totalMinutes = hour * 60 + minute;
  return (totalMinutes >= 570 && totalMinutes < 690) || (totalMinutes >= 840 && totalMinutes < 960);
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
    stockWindowOnly: parseBoolean("RESEARCH_STOCK_WINDOW_ONLY", environment.RESEARCH_STOCK_WINDOW_ONLY, false),
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
  const recommendationEvidence = Array.isArray(rawCandidates) ? rawCandidates.slice(0, 5).flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as { readonly symbol?: unknown; readonly momentumReturn?: unknown; readonly averageVolume?: unknown; readonly marketSnapshot?: { readonly rsi14?: unknown; readonly relativeVolume20?: unknown } };
    if (typeof item.symbol !== "string") return [];
    const momentum = typeof item.momentumReturn === "string" ? `momentum ${item.momentumReturn}` : "momentum not reported";
    const volume = typeof item.averageVolume === "string" ? `avg volume ${item.averageVolume}` : "avg volume not reported";
    const indicators = item.marketSnapshot && typeof item.marketSnapshot === "object" ? `RSI14 ${typeof item.marketSnapshot.rsi14 === "string" ? item.marketSnapshot.rsi14 : "not reported"}, RV20 ${typeof item.marketSnapshot.relativeVolume20 === "string" ? item.marketSnapshot.relativeVolume20 : "not reported"}` : "indicators not reported";
    return [`${item.symbol}: ${momentum}, ${volume}, ${indicators}`];
  }) : [];
  const candidates = Array.isArray(rawCandidates) ? rawCandidates.filter(isResearchCandidate).slice(0, input.preparation.maxCandidates) : [];
  return { agentType: input.preparation.agentType, runId: request.runId, status: result.status, ...(candidates.length > 0 ? { candidates } : {}), ...(recommendationSymbols.length > 0 ? { recommendationSymbols } : {}), ...(recommendationEvidence.length > 0 ? { recommendationEvidence } : {}) };
}

export function createResearchPreparationQueueHandler(input: {
  readonly clock?: () => Date;
  readonly environment?: NodeJS.ProcessEnv;
  readonly persistence: ResearchRunPersistence;
  readonly source: ResearchPreparationSource;
  readonly onResult?: (result: ResearchPreparationResult) => Promise<void> | void;
  readonly onBatchResult?: (results: readonly ResearchPreparationResult[]) => Promise<void> | void;
  readonly notify?: (alert: { readonly code: string; readonly cooldownKey?: string; readonly cooldownMs?: number; readonly dedupeKey?: string; readonly message: string; readonly severity: "critical" | "info" | "warning" }) => Promise<void> | void;
}) {
  const environment = input.environment ?? process.env;
  return async (job: ResearchPreparationJob): Promise<readonly ResearchPreparationResult[]> => {
    void job;
    const readiness = getResearchScheduleReadiness(environment);
    if (readiness.status !== "ready") throw new Error(`Research preparation is not ready: ${readiness.status}.`);
    const preparationConfig = getResearchPreparationConfig(environment);
    const plans = createResearchPreparationPlan(preparationConfig).filter((plan) => !preparationConfig.stockWindowOnly || plan.assetClass === "crypto" || isUsStockResearchWindow(input.clock?.() ?? new Date()));
    if (plans.length === 0) return [];
    const results: ResearchPreparationResult[] = [];
    for (const preparation of plans) {
      try {
        const result = await executeResearchPreparation({ ...(input.clock ? { clock: input.clock } : {}), persistence: input.persistence, preparation, source: input.source });
        results.push(result);
        await input.onResult?.(result);
        if (result.recommendationSymbols?.length) {
          const occurredAt = input.clock?.() ?? new Date();
          await input.notify?.({ code: "research_recommendations", cooldownKey: `research_recommendations:${result.agentType}`, cooldownMs: 86_400_000, dedupeKey: getResearchRecommendationDedupeKey(result.agentType, occurredAt), message: `${result.agentType} selected ${result.recommendationSymbols.length} candidate(s): ${result.recommendationSymbols.join(", ")}. Evidence: ${(result.recommendationEvidence ?? []).join(" | ") || "not reported"}.`, severity: "info" });
        }
      } catch {
        const failedRunId = `research-preparation-${preparation.agentType}-failed-${Date.now()}`;
        results.push({ agentType: preparation.agentType, runId: failedRunId, status: "failed" });
        await input.notify?.({ code: "research_preparation_failed", dedupeKey: `research_preparation_failed:${failedRunId}`, message: `${preparation.agentType} research preparation failed closed; no trade was proposed from this run.`, severity: "critical" });
      }
    }
    if (results.every((result) => result.status === "failed")) throw new Error("All research preparation plans failed.");
    await input.onBatchResult?.(results);
    return results;
  };
}
