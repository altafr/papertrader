import { describe, expect, it, vi } from "vitest";

import type { ResearchAgentInput } from "@momentum/domain";

import { createResearchPreparationPlan, executeResearchPreparation, getResearchPreparationConfig } from "./research-preparation.js";

const input = (assetClass: ResearchAgentInput["assetClass"]): ResearchAgentInput => ({
  assetClass,
  bars: [
    { close: "100", high: "101", low: "99", open: "100", symbol: assetClass === "crypto" ? "BTC/USD" : "AAPL", timestamp: "2026-08-23T00:00:00.000Z", volume: "1000" },
    { close: "101", high: "102", low: "100", open: "101", symbol: assetClass === "crypto" ? "BTC/USD" : "AAPL", timestamp: "2026-08-23T01:00:00.000Z", volume: "1100" },
  ],
  capturedAt: "2026-08-23T02:00:00.000Z",
  freshness: "fresh",
  maxCandidates: 10,
  source: "alpaca",
});

describe("research preparation", () => {
  it("builds bounded stock and crypto plans from explicit symbols", () => {
    const config = getResearchPreparationConfig({ RESEARCH_STOCK_SYMBOLS: " aapl, msft ", RESEARCH_CRYPTO_SYMBOLS: "btc/usd, eth/usd", RESEARCH_LIMIT: "20", RESEARCH_MAX_CANDIDATES: "5" });
    expect(config).toMatchObject({ limit: 20, maxCandidates: 5, stockSymbols: ["AAPL", "MSFT"], cryptoSymbols: ["BTC/USD", "ETH/USD"] });
    expect(createResearchPreparationPlan(config).map((plan) => [plan.agentType, plan.assetClass, plan.symbols])).toEqual([
      ["stock_research", "us_equity", ["AAPL", "MSFT"]],
      ["crypto_research", "crypto", ["BTC/USD", "ETH/USD"]],
    ]);
  });

  it("rejects duplicate or unbounded preparation configuration", () => {
    expect(() => getResearchPreparationConfig({ RESEARCH_SYMBOLS: "AAPL,AAPL" })).toThrow("duplicate");
    expect(() => getResearchPreparationConfig({ RESEARCH_STOCK_SYMBOLS: "AAPL", RESEARCH_CRYPTO_SYMBOLS: "BTC/USD", RESEARCH_LIMIT: "1001" })).toThrow("integer");
  });

  it("hands fresh source input to the deterministic handler and persistence boundary", async () => {
    const calls: string[] = [];
    const persistence = {
      enqueue: async () => { calls.push("enqueue"); },
      start: async () => { calls.push("start"); },
      succeed: async () => { calls.push("succeed"); },
      fail: async () => { calls.push("fail"); },
    };
    const result = await executeResearchPreparation({
      clock: () => new Date("2026-08-23T02:01:00.000Z"),
      persistence,
      preparation: { agentType: "stock_research", assetClass: "us_equity", limit: 2, maxCandidates: 10, symbols: ["AAPL"], timeframe: "1Day" },
      source: { read: vi.fn(async () => input("us_equity")) },
    });
    expect(result).toEqual({ agentType: "stock_research", runId: "research-preparation-stock_research-20260823020000", status: "succeeded" });
    expect(calls).toEqual(["enqueue", "start", "succeed"]);
  });
});
