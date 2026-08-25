import type { MarketBarTimeframe } from "@momentum/alpaca";

export type PaperE2ERunConfig = {
  readonly agentType: "crypto_research" | "stock_research";
  readonly approvalReference: string;
  readonly limit: number;
  readonly maxCandidates: number;
  readonly orderOnce: boolean;
  readonly riskDryRun: boolean;
  readonly runId: string;
  readonly symbols: readonly string[];
  readonly timeframe: MarketBarTimeframe;
};

const boundedReference = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const timeframes: readonly MarketBarTimeframe[] = ["1Day", "1Hour", "1Min", "1Month", "1Week", "5Min", "15Min"];

function boundedInteger(name: string, value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value ?? String(fallback));
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  return parsed;
}

export function validatePaperE2ERunOnce(environment: NodeJS.ProcessEnv = process.env): PaperE2ERunConfig {
  if (environment.PAPER_E2E_RUN_ONCE !== "true") throw new Error("PAPER_E2E_RUN_ONCE must be exactly true for the guarded paper end-to-end command.");
  if (environment.PAPER_E2E_RISK_DRY_RUN !== "true") throw new Error("PAPER_E2E_RISK_DRY_RUN must be exactly true for the candidate-to-risk dry run.");
  const orderOnce = environment.PAPER_E2E_ORDER_ONCE === "true";
  if (environment.PAPER_AUTOPILOT_ENABLED === "true" && !orderOnce) throw new Error("The evidence-only paper end-to-end command must not run while Paper Autopilot is enabled.");
  if (orderOnce && environment.PAPER_AUTOPILOT_ENABLED !== "true") throw new Error("PAPER_E2E_ORDER_ONCE requires command-scoped PAPER_AUTOPILOT_ENABLED=true.");
  if (orderOnce && environment.OPERATING_MODE !== "paper_autopilot") throw new Error("PAPER_E2E_ORDER_ONCE requires command-scoped OPERATING_MODE=paper_autopilot.");
  if (environment.BROKER_CONNECTION_ENABLED !== "true") throw new Error("BROKER_CONNECTION_ENABLED must be explicitly true for the paper end-to-end command.");
  if (!environment.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required for the paper end-to-end command.");
  const approvalReference = environment.PAPER_E2E_APPROVAL_REFERENCE?.trim();
  if (!approvalReference || !boundedReference.test(approvalReference)) throw new Error("PAPER_E2E_APPROVAL_REFERENCE must be a bounded non-secret reference.");
  const runId = environment.PAPER_E2E_RUN_ID?.trim() || `paper-e2e-${Date.now()}`;
  if (!boundedReference.test(runId)) throw new Error("PAPER_E2E_RUN_ID must be a bounded identifier.");
  const agentType = environment.PAPER_E2E_AGENT_TYPE ?? "stock_research";
  if (agentType !== "stock_research" && agentType !== "crypto_research") throw new Error("PAPER_E2E_AGENT_TYPE must be stock_research or crypto_research.");
  const symbols = (environment.PAPER_E2E_SYMBOLS ?? (agentType === "stock_research" ? "AAPL,MSFT" : "BTC/USD"))
    .split(",").map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
  if (symbols.length < 1 || symbols.length > 10) throw new Error("PAPER_E2E_SYMBOLS must contain 1 to 10 symbols.");
  const timeframe = (environment.PAPER_E2E_TIMEFRAME ?? "1Day") as MarketBarTimeframe;
  if (!timeframes.includes(timeframe)) throw new Error("PAPER_E2E_TIMEFRAME is not supported.");
  return {
    agentType,
    approvalReference,
    limit: boundedInteger("PAPER_E2E_LIMIT", environment.PAPER_E2E_LIMIT, 100, 2, 1_000),
    maxCandidates: boundedInteger("PAPER_E2E_MAX_CANDIDATES", environment.PAPER_E2E_MAX_CANDIDATES, 10, 1, 20),
    orderOnce,
    riskDryRun: true,
    runId,
    symbols,
    timeframe,
  };
}
