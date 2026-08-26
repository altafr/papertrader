import { getPaperOnlyRuntimeConfig } from "@momentum/config";

import { getResearchPreparationConfig } from "./research-preparation.js";
import { validateResearchMarketRunOnce } from "./research-market-run-once-guard.js";

export interface ResearchMarketPreflight {
  readonly agentType: "crypto_research" | "stock_research";
  readonly approvalReference: string;
  readonly brokerConnectionEnabled: true;
  readonly databaseConfigured: true;
  readonly limit: number;
  readonly maxCandidates: number;
  readonly paperMode: true;
  readonly symbolCount: number;
  readonly timeframe: string;
}

export function validateResearchMarketPreflight(environment: NodeJS.ProcessEnv = process.env): ResearchMarketPreflight {
  const approval = validateResearchMarketRunOnce(environment);
  const runtime = getPaperOnlyRuntimeConfig(environment);
  if (!runtime.brokerConnectionEnabled) throw new Error("Research market preflight requires command-scoped BROKER_CONNECTION_ENABLED=true.");
  if (!environment.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required for research market preflight.");
  const agentType = environment.RESEARCH_AGENT_TYPE;
  if (agentType !== "stock_research" && agentType !== "crypto_research") throw new Error("RESEARCH_AGENT_TYPE must be stock_research or crypto_research.");
  const symbols = environment.RESEARCH_SYMBOLS?.trim();
  if (!symbols) throw new Error("RESEARCH_SYMBOLS is required for research market preflight.");
  const config = getResearchPreparationConfig({ ...environment, RESEARCH_CRYPTO_SYMBOLS: symbols, RESEARCH_STOCK_SYMBOLS: symbols });
  return { agentType, approvalReference: approval.reference, brokerConnectionEnabled: true, databaseConfigured: true, limit: config.limit, maxCandidates: config.maxCandidates, paperMode: true, symbolCount: agentType === "stock_research" ? config.stockSymbols.length : config.cryptoSymbols.length, timeframe: agentType === "stock_research" ? config.stockTimeframe : config.cryptoTimeframe };
}
