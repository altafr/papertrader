import * as DecimalModule from "decimal.js";
import type { AgentArtifact, AgentHandler } from "./agent-runs.js";
import type { StrategyAssetClass, StrategyBar } from "./strategy.js";

interface DecimalValue {
  div(value: DecimalValue | string): DecimalValue;
  minus(value: DecimalValue | string): DecimalValue;
  plus(value: DecimalValue | string): DecimalValue;
  times(value: DecimalValue | string): DecimalValue;
  greaterThan(value: DecimalValue | string): boolean;
  toDecimalPlaces(decimalPlaces: number): DecimalValue;
  toFixed(decimalPlaces?: number): string;
}
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

export interface ResearchAgentInput {
  readonly assetClass: StrategyAssetClass;
  readonly bars: readonly StrategyBar[];
  readonly capturedAt: string;
  readonly freshness: "fresh";
  readonly maxCandidates: number;
  readonly source: "alpaca";
}

export interface ResearchWatchlistCandidate {
  readonly assetClass: StrategyAssetClass;
  readonly averageVolume: string;
  readonly dataAsOf: string;
  readonly momentumReturn: string;
  readonly symbol: string;
}

export interface ResearchWatchlistPayload {
  readonly assetClass: StrategyAssetClass;
  readonly candidates: readonly ResearchWatchlistCandidate[];
  readonly capturedAt: string;
  readonly universeSize: number;
}

const output = (value: DecimalValue): string => value.toDecimalPlaces(8).toFixed(8);

function parse(value: string, label: string): DecimalValue {
  try {
    const parsed = new Decimal(value);
    if (!parsed.greaterThan("0")) throw new Error("non-positive");
    return parsed;
  } catch {
    throw new Error(`${label} must be a positive decimal string.`);
  }
}

function validateInput(input: ResearchAgentInput): void {
  if (input.source !== "alpaca" || input.freshness !== "fresh") throw new Error("Research input must be fresh Alpaca data.");
  if (Number.isNaN(Date.parse(input.capturedAt))) throw new Error("Research input requires a valid capture timestamp.");
  if (!Number.isSafeInteger(input.maxCandidates) || input.maxCandidates < 1 || input.maxCandidates > 20) throw new Error("maxCandidates must be an integer from 1 to 20.");
  if (input.bars.length < 2 || input.bars.length > 5_000) throw new Error("Research input bars must contain between 2 and 5000 records.");
  for (const bar of input.bars) {
    if (!bar.symbol.trim() || Number.isNaN(Date.parse(bar.timestamp))) throw new Error("Research bars require symbols and valid timestamps.");
    parse(bar.close, "close");
    parse(bar.volume, "volume");
  }
}

function buildWatchlist(input: ResearchAgentInput): ResearchWatchlistPayload {
  validateInput(input);
  const grouped = new Map<string, StrategyBar[]>();
  for (const bar of [...input.bars].sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
    grouped.set(bar.symbol, [...(grouped.get(bar.symbol) ?? []), bar]);
  }
  const candidates: ResearchWatchlistCandidate[] = [];
  for (const [symbol, bars] of grouped) {
    if (bars.length < 2) continue;
    const first = parse(bars[0]!.close, "close");
    const latest = parse(bars[bars.length - 1]!.close, "close");
    const averageVolume = bars.reduce((sum, bar) => sum.plus(parse(bar.volume, "volume")), new Decimal("0")).div(String(bars.length));
    candidates.push({
      assetClass: input.assetClass,
      averageVolume: output(averageVolume),
      dataAsOf: bars[bars.length - 1]!.timestamp,
      momentumReturn: output(latest.div(first).minus("1")),
      symbol,
    });
  }
  candidates.sort((a, b) => {
    const difference = new Decimal(a.momentumReturn).minus(b.momentumReturn);
    return difference.toFixed() === "0" ? a.symbol.localeCompare(b.symbol) : difference.greaterThan("0") ? -1 : 1;
  });
  return { assetClass: input.assetClass, candidates: candidates.slice(0, input.maxCandidates), capturedAt: input.capturedAt, universeSize: grouped.size };
}

function toArtifact(input: ResearchAgentInput): AgentArtifact {
  const payload = buildWatchlist(input);
  return {
    artifactType: "research_watchlist",
    confidence: "not_calibrated",
    evidenceRefs: [`alpaca-market:${input.assetClass}:${input.capturedAt}`],
    payload: payload as unknown as Readonly<Record<string, unknown>>,
    rationale: `Ranked ${payload.universeSize} ${input.assetClass} symbols by point-in-time momentum; this is research evidence, not an order recommendation.`,
    schemaVersion: "1",
  };
}

export function runStockResearch(input: Omit<ResearchAgentInput, "assetClass">): AgentArtifact {
  return toArtifact({ ...input, assetClass: "us_equity" });
}

export function runCryptoResearch(input: Omit<ResearchAgentInput, "assetClass">): AgentArtifact {
  return toArtifact({ ...input, assetClass: "crypto" });
}

export function createStockResearchAgent(input: ResearchAgentInput): AgentHandler {
  if (input.assetClass !== "us_equity") throw new Error("Stock research requires the US equity asset class.");
  return () => runStockResearch(input);
}

export function createCryptoResearchAgent(input: ResearchAgentInput): AgentHandler {
  if (input.assetClass !== "crypto") throw new Error("Crypto research requires the crypto asset class.");
  return () => runCryptoResearch(input);
}
