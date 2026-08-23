import { createPaperMarketDataReader, type MarketBarTimeframe } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAgentRunRepository, createDatabase } from "@momentum/db";
import { createCryptoResearchAgent, createStockResearchAgent, type AgentRunRequest, type ResearchAgentInput } from "@momentum/domain";
import { executeResearchRun } from "./research-runner.js";
import { createAlpacaResearchInputSource } from "./research-market-source.js";

if (process.env.RESEARCH_MARKET_RUN_ONCE !== "true") throw new Error("RESEARCH_MARKET_RUN_ONCE must be exactly true for the guarded market research command.");
const runtime = getPaperOnlyRuntimeConfig();
if (!runtime.brokerConnectionEnabled) throw new Error("RESEARCH_MARKET_RUN_ONCE requires command-scoped BROKER_CONNECTION_ENABLED=true.");
if (!process.env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required for the market research command.");
const agentType = process.env.RESEARCH_AGENT_TYPE;
if (agentType !== "stock_research" && agentType !== "crypto_research") throw new Error("RESEARCH_AGENT_TYPE must be stock_research or crypto_research.");
const assetClass = agentType === "stock_research" ? "us_equity" : "crypto";
const symbols = (process.env.RESEARCH_SYMBOLS ?? "").split(",").map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
const timeframe = (process.env.RESEARCH_TIMEFRAME ?? "1Day") as MarketBarTimeframe;
const limit = Number(process.env.RESEARCH_LIMIT ?? "100");
const maxCandidates = Number(process.env.RESEARCH_MAX_CANDIDATES ?? "10");
const { db, pool } = createDatabase();
const repository = createAgentRunRepository(db);
const persistence = { ...repository, enqueue: (run: AgentRunRequest) => repository.enqueue({ agentType: run.agentType, createdAt: new Date(run.createdAt), inputRefs: run.inputRefs, ...(run.modelProvider ? { modelProvider: run.modelProvider } : {}), promptVersion: run.promptVersion, runId: run.runId, status: "queued", task: run.task }) };
try {
  const reader = createPaperMarketDataReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" });
  const input = await createAlpacaResearchInputSource(reader).read({ assetClass, limit, maxCandidates, symbols, timeframe });
  const request: AgentRunRequest = { agentType, createdAt: new Date().toISOString(), inputRefs: [`alpaca-market:${assetClass}:${input.capturedAt}`], promptVersion: "research-market-boundary@1", runId: `research-market-${Date.now()}`, task: `Read and rank ${assetClass} market bars once.` };
  const handler = agentType === "stock_research" ? createStockResearchAgent(input as ResearchAgentInput & { assetClass: "us_equity" }) : createCryptoResearchAgent(input as ResearchAgentInput & { assetClass: "crypto" });
  const result = await executeResearchRun({ handler, persistence, request });
  if (result.status !== "succeeded") throw new Error("research_market_run_failed");
  console.log("Market research run completed.");
} catch {
  console.error("Market research run failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
